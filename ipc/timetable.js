const { ipcMain } = require('electron');
const { 
  timetableQueries, 
  teachingAssignmentQueries, 
  classroomQueries,
  subjectQueries
} = require('../db/queries');

// Genetic Algorithm for Timetable Generation
class GeneticAlgorithm {
  constructor(teachingAssignments, classrooms, subjects) {
    this.teachingAssignments = teachingAssignments;
    this.classrooms = classrooms;
    this.subjects = subjects;
    this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.periods = [1, 2, 3, 4, 5, 6, 7, 8]; // 8 periods per day
    this.populationSize = 50;
    this.maxGenerations = 100;
    this.mutationRate = 0.1;
    this.elitismCount = 5;
  }

  // Generate initial population
  generateInitialPopulation() {
    const population = [];
    for (let i = 0; i < this.populationSize; i++) {
      population.push(this.generateRandomTimetable());
    }
    return population;
  }

  // Generate a random timetable
  generateRandomTimetable() {
    const timetable = [];
    
    // Create a copy of teaching assignments to work with
    const assignments = [...this.teachingAssignments];
    
    // Shuffle assignments to randomize
    this.shuffleArray(assignments);
    
    // For each assignment, find a suitable slot
    for (const assignment of assignments) {
      const subject = this.subjects.find(s => s.course_code === assignment.course_code);
      if (!subject) continue;
      
      // Determine total hours needed for this subject
      const totalHours = (subject.lecture_hr || 0) + (subject.theory_hr || 0) + (subject.practical_hr || 0);
      
      // Find suitable classrooms
      const suitableClassrooms = this.classrooms.filter(c => {
        // For practical classes, we need a lab
        if (subject.practical_hr > 0 && c.type === 'lab') return true;
        // For lecture/theory classes, we need a lecture room
        if ((subject.lecture_hr > 0 || subject.theory_hr > 0) && c.type === 'lecture') return true;
        return false;
      });
      
      if (suitableClassrooms.length === 0) continue;
      
      // Allocate slots for this assignment
      for (let hour = 0; hour < totalHours; hour++) {
        let allocated = false;
        let attempts = 0;
        const maxAttempts = this.days.length * this.periods.length;
        
        while (!allocated && attempts < maxAttempts) {
          // Pick a random day, period, and classroom
          const day = this.days[Math.floor(Math.random() * this.days.length)];
          const period = this.periods[Math.floor(Math.random() * this.periods.length)];
          const classroom = suitableClassrooms[Math.floor(Math.random() * suitableClassrooms.length)];
          
          // Check if this slot is already taken in the timetable
          const conflict = timetable.some(entry => 
            (entry.day === day && entry.period === period && entry.room_id === classroom.room_id) || // Room conflict
            (entry.day === day && entry.period === period && entry.teacher_id === assignment.teacher_id) || // Teacher conflict
            (entry.day === day && entry.period === period && 
             entry.semester === assignment.semester && 
             entry.branch === assignment.branch && 
             entry.section === assignment.section) // Class conflict
          );
          
          if (!conflict) {
            timetable.push({
              semester: assignment.semester,
              branch: assignment.branch,
              section: assignment.section,
              day,
              period,
              course_code: assignment.course_code,
              teacher_id: assignment.teacher_id,
              room_id: classroom.room_id
            });
            allocated = true;
          }
          
          attempts++;
        }
      }
    }
    
    return timetable;
  }

  // Evaluate fitness of a timetable
  evaluateFitness(timetable) {
    let fitness = 0;
    
    // Check for conflicts (lower is better)
    const conflicts = this.countConflicts(timetable);
    fitness -= conflicts * 100; // Heavy penalty for conflicts
    
    // Check for gaps in student schedules (lower is better)
    const gaps = this.countStudentGaps(timetable);
    fitness -= gaps * 10;
    
    // Check for balanced distribution across days (higher is better)
    const balance = this.evaluateDayBalance(timetable);
    fitness += balance * 5;
    
    // Check for appropriate room allocation (higher is better)
    const roomAllocation = this.evaluateRoomAllocation(timetable);
    fitness += roomAllocation * 20;
    
    return fitness;
  }

  // Count conflicts in a timetable
  countConflicts(timetable) {
    let conflicts = 0;
    
    for (let i = 0; i < timetable.length; i++) {
      for (let j = i + 1; j < timetable.length; j++) {
        const entry1 = timetable[i];
        const entry2 = timetable[j];
        
        // Same day and period
        if (entry1.day === entry2.day && entry1.period === entry2.period) {
          // Room conflict
          if (entry1.room_id === entry2.room_id) {
            conflicts++;
          }
          
          // Teacher conflict
          if (entry1.teacher_id === entry2.teacher_id) {
            conflicts++;
          }
          
          // Class conflict
          if (entry1.semester === entry2.semester && 
              entry1.branch === entry2.branch && 
              entry1.section === entry2.section) {
            conflicts++;
          }
        }
      }
    }
    
    return conflicts;
  }

  // Count gaps in student schedules
  countStudentGaps(timetable) {
    let totalGaps = 0;
    
    // Group by class and day
    const classDaySchedules = {};
    
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const dayKey = entry.day;
      
      if (!classDaySchedules[classKey]) {
        classDaySchedules[classKey] = {};
      }
      
      if (!classDaySchedules[classKey][dayKey]) {
        classDaySchedules[classKey][dayKey] = [];
      }
      
      classDaySchedules[classKey][dayKey].push(entry.period);
    }
    
    // Count gaps for each class and day
    for (const classKey in classDaySchedules) {
      for (const dayKey in classDaySchedules[classKey]) {
        const periods = classDaySchedules[classKey][dayKey].sort((a, b) => a - b);
        
        if (periods.length > 1) {
          for (let i = 1; i < periods.length; i++) {
            const gap = periods[i] - periods[i - 1] - 1;
            if (gap > 0) {
              totalGaps += gap;
            }
          }
        }
      }
    }
    
    return totalGaps;
  }

  // Evaluate day balance
  evaluateDayBalance(timetable) {
    // Group by class and count entries per day
    const classDayCounts = {};
    
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const dayKey = entry.day;
      
      if (!classDayCounts[classKey]) {
        classDayCounts[classKey] = {};
      }
      
      if (!classDayCounts[classKey][dayKey]) {
        classDayCounts[classKey][dayKey] = 0;
      }
      
      classDayCounts[classKey][dayKey]++;
    }
    
    // Calculate standard deviation of counts for each class
    let totalStdDev = 0;
    let classCount = 0;
    
    for (const classKey in classDayCounts) {
      const counts = Object.values(classDayCounts[classKey]);
      const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);
      
      totalStdDev += stdDev;
      classCount++;
    }
    
    // Lower standard deviation means better balance
    return classCount > 0 ? 10 - (totalStdDev / classCount) : 0;
  }

  // Evaluate room allocation
  evaluateRoomAllocation(timetable) {
    let score = 0;
    
    for (const entry of timetable) {
      const subject = this.subjects.find(s => s.course_code === entry.course_code);
      const classroom = this.classrooms.find(c => c.room_id === entry.room_id);
      
      if (subject && classroom) {
        // Check if practical subjects are in labs
        if (subject.practical_hr > 0 && classroom.type === 'lab') {
          score++;
        }
        
        // Check if lecture/theory subjects are in lecture rooms
        if ((subject.lecture_hr > 0 || subject.theory_hr > 0) && classroom.type === 'lecture') {
          score++;
        }
      }
    }
    
    return score;
  }

  // Tournament selection
  tournamentSelection(population, fitnesses) {
    const tournamentSize = 3;
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const index = Math.floor(Math.random() * population.length);
      tournament.push({ index, fitness: fitnesses[index] });
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    return population[tournament[0].index];
  }

  // Crossover two timetables
  crossover(parent1, parent2) {
    // Group entries by class
    const parent1ByClass = this.groupByClass(parent1);
    const parent2ByClass = this.groupByClass(parent2);
    
    const child = [];
    
    // For each class, randomly choose entries from either parent
    const allClasses = new Set([
      ...Object.keys(parent1ByClass),
      ...Object.keys(parent2ByClass)
    ]);
    
    for (const classKey of allClasses) {
      // Randomly choose which parent to inherit from for this class
      const sourceParent = Math.random() < 0.5 ? 
        parent1ByClass[classKey] || [] : 
        parent2ByClass[classKey] || [];
      
      child.push(...sourceParent);
    }
    
    return child;
  }

  // Group timetable entries by class
  groupByClass(timetable) {
    const byClass = {};
    
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      
      if (!byClass[classKey]) {
        byClass[classKey] = [];
      }
      
      byClass[classKey].push(entry);
    }
    
    return byClass;
  }

  // Mutate a timetable
  mutate(timetable) {
    const mutatedTimetable = [...timetable];
    
    for (let i = 0; i < mutatedTimetable.length; i++) {
      if (Math.random() < this.mutationRate) {
        // Randomly change day, period, or room
        const entry = { ...mutatedTimetable[i] };
        const mutationType = Math.floor(Math.random() * 3);
        
        switch (mutationType) {
          case 0: // Change day
            entry.day = this.days[Math.floor(Math.random() * this.days.length)];
            break;
          case 1: // Change period
            entry.period = this.periods[Math.floor(Math.random() * this.periods.length)];
            break;
          case 2: // Change room
            const subject = this.subjects.find(s => s.course_code === entry.course_code);
            if (subject) {
              const suitableClassrooms = this.classrooms.filter(c => {
                if (subject.practical_hr > 0 && c.type === 'lab') return true;
                if ((subject.lecture_hr > 0 || subject.theory_hr > 0) && c.type === 'lecture') return true;
                return false;
              });
              
              if (suitableClassrooms.length > 0) {
                const classroom = suitableClassrooms[Math.floor(Math.random() * suitableClassrooms.length)];
                entry.room_id = classroom.room_id;
              }
            }
            break;
        }
        
        mutatedTimetable[i] = entry;
      }
    }
    
    return mutatedTimetable;
  }

  // Shuffle array (Fisher-Yates algorithm)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Run the genetic algorithm
  run() {
    // Generate initial population
    let population = this.generateInitialPopulation();
    
    // Evaluate initial population
    let fitnesses = population.map(timetable => this.evaluateFitness(timetable));
    
    // Find best timetable in initial population
    let bestIndex = fitnesses.indexOf(Math.max(...fitnesses));
    let bestTimetable = population[bestIndex];
    let bestFitness = fitnesses[bestIndex];
    
    // Main loop
    for (let generation = 0; generation < this.maxGenerations; generation++) {
      // Create new population
      const newPopulation = [];
      
      // Elitism: keep best individuals
      const sortedIndices = fitnesses
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .map(item => item.index);
      
      for (let i = 0; i < this.elitismCount; i++) {
        newPopulation.push(population[sortedIndices[i]]);
      }
      
      // Fill the rest of the population with offspring
      while (newPopulation.length < this.populationSize) {
        // Select parents
        const parent1 = this.tournamentSelection(population, fitnesses);
        const parent2 = this.tournamentSelection(population, fitnesses);
        
        // Crossover
        let offspring = this.crossover(parent1, parent2);
        
        // Mutation
        offspring = this.mutate(offspring);
        
        newPopulation.push(offspring);
      }
      
      // Replace old population
      population = newPopulation;
      
      // Evaluate new population
      fitnesses = population.map(timetable => this.evaluateFitness(timetable));
      
      // Update best timetable if needed
      bestIndex = fitnesses.indexOf(Math.max(...fitnesses));
      if (fitnesses[bestIndex] > bestFitness) {
        bestTimetable = population[bestIndex];
        bestFitness = fitnesses[bestIndex];
      }
      
      // Early termination if we have a perfect timetable (no conflicts)
      if (this.countConflicts(bestTimetable) === 0) {
        break;
      }
    }
    
    return bestTimetable;
  }
}

// Handle generate-timetable request
ipcMain.on('generate-timetable', async (event, { semester, branch, section }) => {
  try {
    // Validate input
    if (!semester || !branch || !section) {
      event.reply('generate-timetable-response', {
        success: false,
        message: 'Semester, Branch, and Section are required'
      });
      return;
    }

    // Get teaching assignments for this class
    const assignments = await teachingAssignmentQueries.getTeachingAssignmentsByClass(
      semester, branch, section
    );

    if (assignments.length === 0) {
      event.reply('generate-timetable-response', {
        success: false,
        message: 'No teaching assignments found for this class'
      });
      return;
    }

    // Get all classrooms
    const classrooms = await classroomQueries.getAllClassrooms();

    if (classrooms.length === 0) {
      event.reply('generate-timetable-response', {
        success: false,
        message: 'No classrooms available'
      });
      return;
    }

    // Get all subjects
    const subjects = await subjectQueries.getAllSubjects();

    // Run genetic algorithm
    const geneticAlgorithm = new GeneticAlgorithm(assignments, classrooms, subjects);
    const timetable = geneticAlgorithm.run();

    // Clear existing timetable for this class
    await timetableQueries.clearClassTimetable(semester, branch, section);

    // Save the generated timetable
    for (const entry of timetable) {
      await timetableQueries.saveTimetableEntry(entry);
    }

    event.reply('generate-timetable-response', {
      success: true,
      message: 'Timetable generated successfully'
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    event.reply('generate-timetable-response', {
      success: false,
      message: `Error generating timetable: ${error.message}`
    });
  }
});

// Handle get-class-timetable request
ipcMain.on('get-class-timetable', async (event, { semester, branch, section }) => {
  try {
    const timetable = await timetableQueries.getClassTimetable(semester, branch, section);
    event.reply('get-class-timetable-response', {
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error getting class timetable:', error);
    event.reply('get-class-timetable-response', {
      success: false,
      message: `Error getting class timetable: ${error.message}`
    });
  }
});

// Handle get-teacher-timetable request
ipcMain.on('get-teacher-timetable', async (event, teacherId) => {
  try {
    const timetable = await timetableQueries.getTeacherTimetable(teacherId);
    event.reply('get-teacher-timetable-response', {
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error getting teacher timetable:', error);
    event.reply('get-teacher-timetable-response', {
      success: false,
      message: `Error getting teacher timetable: ${error.message}`
    });
  }
});

// Handle get-classroom-timetable request
ipcMain.on('get-classroom-timetable', async (event, roomId) => {
  try {
    const timetable = await timetableQueries.getClassroomTimetable(roomId);
    event.reply('get-classroom-timetable-response', {
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error getting classroom timetable:', error);
    event.reply('get-classroom-timetable-response', {
      success: false,
      message: `Error getting classroom timetable: ${error.message}`
    });
  }
});

// Handle clear-class-timetable request
ipcMain.on('clear-class-timetable', async (event, { semester, branch, section }) => {
  try {
    await timetableQueries.clearClassTimetable(semester, branch, section);
    event.reply('clear-class-timetable-response', {
      success: true,
      message: 'Timetable cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing class timetable:', error);
    event.reply('clear-class-timetable-response', {
      success: false,
      message: `Error clearing class timetable: ${error.message}`
    });
  }
});

// Handle clear-all-timetables request
ipcMain.on('clear-all-timetables', async (event) => {
  try {
    await timetableQueries.clearAllTimetables();
    event.reply('clear-all-timetables-response', {
      success: true,
      message: 'All timetables cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing all timetables:', error);
    event.reply('clear-all-timetables-response', {
      success: false,
      message: `Error clearing all timetables: ${error.message}`
    });
  }
});

console.log('Timetable IPC handlers registered');