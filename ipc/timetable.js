const { ipcMain } = require('electron');
const {
  timetableQueries,
  teachingAssignmentQueries,
  classroomQueries,
  subjectQueries,
  classQueries,
  teacherQueries,
  teacherAvailabilityQueries,
} = require('../db/queries');
// ipc/timetable.js
const path = require('path');
const os = require('os');
const { BrowserWindow } = require('electron'); // reuse your main BrowserWindow for printing
const fs = require('fs');

function getSemesterSession() {
  const now = new Date();
  const month = now.getMonth() + 1; // JS months are 0–11
  const year = now.getFullYear();

  // Always session year to year+1
  const session = `${year}–${year + 1}`;

  // Odd if Jan–Jun, Even if Jul–Dec
  const semType = month >= 1 && month <= 6 ? 'Odd Semester' : 'Even Semester';

  return { session, semType };
}

function buildClassHTML(cls, timetable, subjects, meta, includeCourseDetails = true) {
  const { session, semType } = getSemesterSession();
  // meta: { hall, effectiveDate }
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const slots = [
    '9:00 - 10:00','10:00 - 11:00','11:00 - 12:00',
    '12:00 - 1:00','2:00 - 3:00','3:00 - 4:00', '4:00 - 5:00'
  ];

  // Build grid body rows
  const rows = days.map(day => {
    const cells = slots.map((_, idx) => {
      const p = idx + 1;
      const e = timetable.find(t => t.day === day && t.period === p);
      if (!e) return `<td>-</td>`;
      return `<td>
        <strong>${e.subject_name || e.course_code}</strong><br>
        ${e.teacher_name || ''}<br>
        ${e.room_id || ''}
      </td>`;
    }).join('');
    return `<tr><th>${day.toUpperCase()}</th>${cells}</tr>`;
  }).join('');

  // Course details
  const semesterLabel =
    cls.semester && cls.semester.trim() !== ''
      ? `${cls.semester} SEMESTER`
      : `${cls.semester}`;

  const headerHTML = `
  <h1>SCHOOL OF CSE, SMVDU</h1>
  <h2>B.Tech CSE (${cls.section}) – ${semesterLabel} Timetable</h2>
`;

  let courseDetailsHTML = '';
  if (includeCourseDetails) {
    const courseRows = subjects.map(s => `
    <tr>
      <td>${s.category || ''}</td>
      <td>${s.course_code || ''}</td>
      <td>${s.name || ''}</td>
      <td>${s.lecture_hr || 0}</td>
      <td>${s.theory_hr || 0}</td>
      <td>${s.practical_hr || 0}</td>
      <td>${s.credits || 0}</td>
      <td>${s.course_coordinator || ''}</td>
      <td>${s.display_code || ''}</td>
    </tr>
  `).join('');

    const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);

    courseDetailsHTML = `<div class="page-break"></div>

  <h3>Course details</h3>
  <table>
    <thead>
      <tr>
        <th>Category</th><th>Course Code</th><th>Course Title</th>
        <th>L</th><th>T</th><th>P</th><th>C</th>
        <th>Course Coordinator</th><th>Code</th>
      </tr>
    </thead>
    <tbody>
      ${courseRows}
      <tr>
        <td colspan="6" style="text-align:right;font-weight:bold;">Total Credits</td>
        <td style="font-weight:bold;">${totalCredits}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>`
  }
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${cls.semester}-${cls.branch}-${cls.section} Timetable</title>
<style>
  body { font-family: "Times New Roman", Times, serif; margin: 30px; }
  h1, h2, h3 { margin: 4px 0; text-align: center; }
  .meta { text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #000; padding: 8px; font-size: 12px; }
  thead th { background: #f2f2f2; font-weight: bold; }
  tbody th { background: #f9f9f9; font-weight: bold; width: 120px; }
  .footer { display:flex; justify-content:space-between; margin-top: 20px; font-size: 11px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
${headerHTML}
  <div class="meta"><br>
  ${semType} – Session ${session}</div>

  <table>
    <thead>
      <tr>
        <th>Day/Time</th>
        ${slots.map((s) => `<th>${s}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  ${courseDetailsHTML}
  <div class="footer">
    <div>Sudesh Kumar, Faculty In-charge, Time Table, SoCSE</div>
    <div>Dr. Sunanda, Head, SoCSE</div>
  </div>
</body>
</html>`;
  }

async function renderHTMLToPDF(htmlString, pdfPath, parentWindow) {
  const tmpHtml = path.join(os.tmpdir(), `tt-${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, htmlString, 'utf8');

  const printWin = new BrowserWindow({
    width: 1024, height: 768, show: false,
    webPreferences: { offscreen: true }
  });

  await printWin.loadFile(tmpHtml);
  const data = await printWin.webContents.printToPDF({
    marginsType: 1,
    printBackground: true,
    pageSize: 'A4'
  });
  fs.writeFileSync(pdfPath, data);
  printWin.destroy();
}

ipcMain.on('generate-reports', async (event) => {
  try {
    const baseDir = path.join(__dirname, '../timetable_reports');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

    const now = new Date();
    const uniqueId = now
      .toISOString()
      .replace(/:/g, '-') // replace colons
      .replace(/\..+/, ''); // drop milliseconds
    const outputDir = path.join(baseDir, uniqueId);

    fs.mkdirSync(outputDir);

    // 1) Class-wise PDFs (multiple)
    const allClasses = await classQueries.getAllClasses();

    for (const cls of allClasses) {
      const tt = await timetableQueries.getClassTimetable(cls.semester, cls.branch, cls.section);
      const assignments =
        await teachingAssignmentQueries.getTeachingAssignmentsByClass(
          cls.semester,
          cls.branch,
          cls.section
        );
      const allSubjects = await subjectQueries.getAllSubjects();
      const classSubjects = allSubjects.filter((sub) =>
        assignments.some((a) => a.course_code === sub.course_code)
      );
      const html = buildClassHTML(cls, tt, classSubjects, {
        hall: '',
        effectiveDate: Date.UTC.now,
      }, true);
      const pdfPath = path.join(outputDir, `${cls.semester}-${cls.section}-${cls.branch}.pdf`);
      await renderHTMLToPDF(html, pdfPath, BrowserWindow.getFocusedWindow());
    }

    // 2) Teacher-wise (one PDF, multiple pages)
    {
      const teachers = await teacherQueries.getAllTeachers();
      console.log(teachers)
      const pages = [];
      for (const t of teachers) {
        const tt = await timetableQueries.getTeacherTimetable(t.id);
        const cls = { semester: '', branch: '', section: t.full_name }; // for header convenience
        pages.push(buildClassHTML(
          cls,
          tt,
          [], // or teacher’s subjects if you want a second table
          { hall: '', effectiveDate: '12th September, 2025' }, false
        ));
      }
      // Concatenate HTML pages with page-breaks for one PDF
      const joined = pages.join('<div class="page-break"></div>');
      const pdfPath = path.join(outputDir, 'AllTeachers.pdf');
      await renderHTMLToPDF(joined, pdfPath, BrowserWindow.getFocusedWindow());
    }

    // 3) Classroom-wise (one PDF, multiple pages)
    {
      const rooms = await classroomQueries.getAllClassrooms();
      const pages = [];
      for (const r of rooms) {
        const tt = await timetableQueries.getClassroomTimetable(r.room_id);
        const cls = { semester: '', branch: r.type, section: r.room_id };
        pages.push(buildClassHTML(
          cls,
          tt,
          [], // or courses per room
          { hall: '', effectiveDate: '12th September, 2025' }, false
        ));
      }
      const joined = pages.join('<div class="page-break"></div>');
      const pdfPath = path.join(outputDir, 'AllClassrooms.pdf');
      await renderHTMLToPDF(joined, pdfPath, BrowserWindow.getFocusedWindow());
    }

    event.reply('generate-reports-response', {
      success: true,
      message: 'Reports generated successfully in timetable_reports'
    });
  } catch (err) {
    console.error(err);
    event.reply('generate-reports-response', { success: false, message: err.message });
  }
});

// Genetic Algorithm for Timetable Generation
class GeneticAlgorithm {
  constructor(
    teachingAssignments,
    classrooms,
    subjects,
    teacherAvailability = {}
  ) {
    this.teachingAssignments = teachingAssignments;
    this.classrooms = classrooms;
    this.subjects = subjects;
    this.teacherAvailability = teacherAvailability || {};
    this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.periods = [1, 2, 3, 4, 5, 6, 7]; // 7 periods per day
    this.timeSlots = [
      '9 am - 10 am',
      '10 am - 11 am',
      '11 am - 12 pm',
      '12 pm - 1 pm',
      '2 pm - 3 pm',
      '3 pm - 4 pm',
      '4 pm - 5 pm',
    ];
    this.populationSize = 50;
    this.maxGenerations = 100;
    this.mutationRate = 0.1;
    this.elitismCount = 5;
    this.lunchBreakPeriod = 4; // Lunch break after period 4
    this.maxLecturesPerWeek = 3; // Maximum 3 lectures per week for non-lab subjects
  }

  generateInitialPopulation() {
    const population = [];
    for (let i = 0; i < this.populationSize; i++) {
      population.push(this.generateRandomTimetable());
    }
    return population;
  }

  generateRandomTimetable() {
    const timetable = [];
    const assignments = [...this.teachingAssignments];
    this.shuffleArray(assignments);

    // Track allocated subjects per class per day to prevent repetition
    const classSubjectDayTracker = {};
    // Track allocated classrooms per class to ensure consistency
    const classRoomTracker = {};
    // Track lecture count per subject per class per week
    const subjectLectureCountTracker = {};
    // Track lab allocations
    const labAllocations = {};
    // Track classrooms assigned to each class/section
    const classSectionRooms = {};

    // Group assignments by class for consistent room allocation
    const assignmentsByClass = {};
    for (const assignment of assignments) {
      const classKey = `${assignment.semester}-${assignment.branch}-${assignment.section}`;
      if (!assignmentsByClass[classKey]) {
        assignmentsByClass[classKey] = [];
      }
      assignmentsByClass[classKey].push(assignment);
    }

    // Pre-assign classrooms to each class/section
    for (const classKey in assignmentsByClass) {
      classSectionRooms[classKey] = {
        lecture: null,
        lab: null,
      };

      // Assign a consistent lecture room for this class/section
      const lectureRooms = this.classrooms.filter((c) => c.type === 'lecture');
      if (lectureRooms.length > 0) {
        classSectionRooms[classKey].lecture =
          lectureRooms[Math.floor(Math.random() * lectureRooms.length)].room_id;
      }

      // Assign a consistent lab room for this class/section
      const labRooms = this.classrooms.filter((c) => c.type === 'lab');
      if (labRooms.length > 0) {
        classSectionRooms[classKey].lab =
          labRooms[Math.floor(Math.random() * labRooms.length)].room_id;
      }
    }

    // Process each class/section separately
    for (const classKey in assignmentsByClass) {
      const classAssignments = assignmentsByClass[classKey];

      // Initialize trackers for this class
      if (!classSubjectDayTracker[classKey])
        classSubjectDayTracker[classKey] = {};
      if (!classRoomTracker[classKey]) classRoomTracker[classKey] = {};

      for (const assignment of classAssignments) {
        const subject = this.subjects.find(
          (s) => s.course_code === assignment.course_code
        );
        if (!subject) continue;

        const subjectKey = `${classKey}-${assignment.course_code}`;
        if (!subjectLectureCountTracker[subjectKey])
          subjectLectureCountTracker[subjectKey] = 0;

        // Determine if this is a lab subject
        const isLab = subject.practical_hr > 0;

        // Determine how many hours to allocate
        let hoursToAllocate = 0;
        if (isLab) {
          // Labs are 1 per week with continuous 2 hours
          hoursToAllocate = 2;
        } else {
          // Non-lab subjects get up to 3 lectures per week
          const remainingLectures =
            this.maxLecturesPerWeek -
            (subjectLectureCountTracker[subjectKey] || 0);
          hoursToAllocate = Math.min(
            remainingLectures,
            (subject.lecture_hr || 0) + (subject.theory_hr || 0)
          );
        }

        if (hoursToAllocate <= 0) continue;

        // Use the pre-assigned classroom for this class/section based on subject type
        let assignedRoomId = null;
        if (isLab && classSectionRooms[classKey].lab) {
          assignedRoomId = classSectionRooms[classKey].lab;
        } else if (!isLab && classSectionRooms[classKey].lecture) {
          assignedRoomId = classSectionRooms[classKey].lecture;
        }

        // If no pre-assigned room, find a suitable one
        if (!assignedRoomId) {
          const suitableClassrooms = this.classrooms.filter((c) => {
            if (isLab && c.type === 'lab') return true;
            if (!isLab && c.type === 'lecture') return true;
            return false;
          });

          if (suitableClassrooms.length === 0) continue;

          const classroom =
            suitableClassrooms[
              Math.floor(Math.random() * suitableClassrooms.length)
            ];
          assignedRoomId = classroom.room_id;

          // Store this assignment for future use
          if (isLab) {
            classSectionRooms[classKey].lab = assignedRoomId;
          } else {
            classSectionRooms[classKey].lecture = assignedRoomId;
          }
        }

        // For labs, we need to allocate 2 continuous hours on the same day
        if (isLab) {
          let allocated = false;
          let attempts = 0;
          const maxAttempts = this.days.length * (this.periods.length - 1); // -1 because we need 2 consecutive periods

          while (!allocated && attempts < maxAttempts) {
            const day = this.days[Math.floor(Math.random() * this.days.length)];
            // Don't start a lab in the last period or right before lunch
            const validStartPeriods = this.periods.filter(
              (p) => p !== this.lunchBreakPeriod && p < this.periods.length
            );
            const startPeriod =
              validStartPeriods[
                Math.floor(Math.random() * validStartPeriods.length)
              ];
            const endPeriod = startPeriod + 1;

            if (
              this.isTeacherSlotBlocked(
                assignment.teacher_id,
                day,
                startPeriod
              ) ||
              this.isTeacherSlotBlocked(assignment.teacher_id, day, endPeriod)
            ) {
              attempts++;
              continue;
            }

            if (
              this.teacherHasAdjacentConflict(
                timetable,
                assignment.teacher_id,
                day,
                startPeriod,
                { allowLabPair: true, labCourseCode: assignment.course_code }
              ) ||
              this.teacherHasAdjacentConflict(
                timetable,
                assignment.teacher_id,
                day,
                endPeriod,
                { allowLabPair: true, labCourseCode: assignment.course_code }
              )
            ) {
              attempts++;
              continue;
            }

            // Skip if periods span across lunch break
            if (
              startPeriod < this.lunchBreakPeriod &&
              endPeriod > this.lunchBreakPeriod
            ) {
              attempts++;
              continue;
            }

            // Check for conflicts in both periods
            const conflict = timetable.some(
              (entry) =>
                // Room conflict
                (entry.day === day &&
                  entry.period === startPeriod &&
                  entry.room_id === assignedRoomId) ||
                (entry.day === day &&
                  entry.period === endPeriod &&
                  entry.room_id === assignedRoomId) ||
                // Teacher conflict
                (entry.day === day &&
                  entry.period === startPeriod &&
                  entry.teacher_id === assignment.teacher_id) ||
                (entry.day === day &&
                  entry.period === endPeriod &&
                  entry.teacher_id === assignment.teacher_id) ||
                // Class conflict
                (entry.day === day &&
                  entry.period === startPeriod &&
                  entry.semester === assignment.semester &&
                  entry.branch === assignment.branch &&
                  entry.section === assignment.section) ||
                (entry.day === day &&
                  entry.period === endPeriod &&
                  entry.semester === assignment.semester &&
                  entry.branch === assignment.branch &&
                  entry.section === assignment.section)
            );

            // Check if subject already allocated on this day for this class
            const subjectAlreadyOnDay =
              classSubjectDayTracker[classKey][day] &&
              classSubjectDayTracker[classKey][day].includes(
                assignment.course_code
              );

            if (!conflict && !subjectAlreadyOnDay) {
              // Add first hour
              timetable.push({
                semester: assignment.semester,
                branch: assignment.branch,
                section: assignment.section,
                day,
                period: startPeriod,
                course_code: assignment.course_code,
                teacher_id: assignment.teacher_id,
                room_id: assignedRoomId,
                is_lab: true,
                lab_session: 1,
              });

              // Add second hour
              timetable.push({
                semester: assignment.semester,
                branch: assignment.branch,
                section: assignment.section,
                day,
                period: endPeriod,
                course_code: assignment.course_code,
                teacher_id: assignment.teacher_id,
                room_id: assignedRoomId,
                is_lab: true,
                lab_session: 2,
              });

              // Track the allocation
              if (!classSubjectDayTracker[classKey][day])
                classSubjectDayTracker[classKey][day] = [];
              classSubjectDayTracker[classKey][day].push(
                assignment.course_code
              );
              classRoomTracker[classKey][subject.course_code] = assignedRoomId;
              labAllocations[subjectKey] = true;

              allocated = true;
            }
            attempts++;
          }
        } else {
          // For regular lectures (non-lab)
          for (let hour = 0; hour < hoursToAllocate; hour++) {
            let allocated = false;
            let attempts = 0;
            const maxAttempts = this.days.length * this.periods.length;

            while (!allocated && attempts < maxAttempts) {
              const day =
                this.days[Math.floor(Math.random() * this.days.length)];
              // Skip lunch break period
              const validPeriods = this.periods.filter(
                (p) => p !== this.lunchBreakPeriod
              );
              const period =
                validPeriods[Math.floor(Math.random() * validPeriods.length)];

              if (
                this.isTeacherSlotBlocked(assignment.teacher_id, day, period)
              ) {
                attempts++;
                continue;
              }

              if (
                this.teacherHasAdjacentConflict(
                  timetable,
                  assignment.teacher_id,
                  day,
                  period
                )
              ) {
                attempts++;
                continue;
              }

              const conflict = timetable.some(
                (entry) =>
                  (entry.day === day &&
                    entry.period === period &&
                    entry.room_id === assignedRoomId) ||
                  (entry.day === day &&
                    entry.period === period &&
                    entry.teacher_id === assignment.teacher_id) ||
                  (entry.day === day &&
                    entry.period === period &&
                    entry.semester === assignment.semester &&
                    entry.branch === assignment.branch &&
                    entry.section === assignment.section)
              );

              // Check if subject already allocated on this day for this class
              const subjectAlreadyOnDay =
                classSubjectDayTracker[classKey][day] &&
                classSubjectDayTracker[classKey][day].includes(
                  assignment.course_code
                );

              if (!conflict && !subjectAlreadyOnDay) {
                timetable.push({
                  semester: assignment.semester,
                  branch: assignment.branch,
                  section: assignment.section,
                  day,
                  period,
                  course_code: assignment.course_code,
                  teacher_id: assignment.teacher_id,
                  room_id: assignedRoomId,
                  is_lab: false,
                });

                // Track the allocation
                if (!classSubjectDayTracker[classKey][day])
                  classSubjectDayTracker[classKey][day] = [];
                classSubjectDayTracker[classKey][day].push(
                  assignment.course_code
                );
                classRoomTracker[classKey][subject.course_code] =
                  assignedRoomId;
                subjectLectureCountTracker[subjectKey]++;

                allocated = true;
              }
              attempts++;
            }
          }
        }
      }
    }
    return timetable;
  }

  evaluateFitness(timetable) {
    let fitness = 0;

    // Heavily penalize conflicts
    const conflicts = this.countConflicts(timetable);
    fitness -= conflicts * 100;

    // Penalize student gaps (higher penalty to minimize gaps)
    const gaps = this.countStudentGaps(timetable);
    fitness -= gaps * 20;

    // Reward day balance
    const balance = this.evaluateDayBalance(timetable);
    fitness += balance * 5;

    // Reward appropriate room allocation
    const roomAllocation = this.evaluateRoomAllocation(timetable);
    fitness += roomAllocation * 20;

    // Penalize subject repetition on same day
    const subjectRepetitions = this.countSubjectRepetitions(timetable);
    fitness -= subjectRepetitions * 50;

    // Penalize inconsistent classroom assignments (increased penalty)
    const inconsistentRooms = this.countInconsistentRooms(timetable);
    fitness -= inconsistentRooms * 60; // Increased from 30 to 60

    // Penalize violations of lab constraints
    const labViolations = this.countLabViolations(timetable);
    fitness -= labViolations * 40;

    // Penalize exceeding lecture limits
    const lectureLimitViolations = this.countLectureLimitViolations(timetable);
    fitness -= lectureLimitViolations * 30;

    const availabilityViolations =
      this.countTeacherAvailabilityViolations(timetable);
    fitness -= availabilityViolations * 80;

    const teacherConsecutive = this.countTeacherConsecutiveSessions(timetable);
    fitness -= teacherConsecutive * 60;

    return fitness;
  }

  countConflicts(timetable) {
    let conflicts = 0;
    for (let i = 0; i < timetable.length; i++) {
      for (let j = i + 1; j < timetable.length; j++) {
        const e1 = timetable[i],
          e2 = timetable[j];
        if (e1.day === e2.day && e1.period === e2.period) {
          if (e1.room_id === e2.room_id) conflicts++;
          if (e1.teacher_id === e2.teacher_id) conflicts++;
          if (
            e1.semester === e2.semester &&
            e1.branch === e2.branch &&
            e1.section === e2.section
          )
            conflicts++;
        }
      }
    }
    return conflicts;
  }

  // Count subject repetitions on the same day for the same class
  countSubjectRepetitions(timetable) {
    let repetitions = 0;
    const classDaySubjects = {};

    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const dayKey = entry.day;
      const subjectKey = entry.course_code;

      if (!classDaySubjects[classKey]) classDaySubjects[classKey] = {};
      if (!classDaySubjects[classKey][dayKey])
        classDaySubjects[classKey][dayKey] = {};

      // For labs, we expect two entries (continuous 2-hour slot)
      if (entry.is_lab) {
        if (!classDaySubjects[classKey][dayKey][subjectKey]) {
          classDaySubjects[classKey][dayKey][subjectKey] = 1;
        } else {
          classDaySubjects[classKey][dayKey][subjectKey]++;
          // Only count as repetition if more than 2 (for labs)
          if (classDaySubjects[classKey][dayKey][subjectKey] > 2) {
            repetitions++;
          }
        }
      } else {
        // For regular lectures, any repetition is counted
        if (!classDaySubjects[classKey][dayKey][subjectKey]) {
          classDaySubjects[classKey][dayKey][subjectKey] = 1;
        } else {
          classDaySubjects[classKey][dayKey][subjectKey]++;
          repetitions++;
        }
      }
    }

    return repetitions;
  }

  // Count inconsistent classroom assignments for the same batch/section
  countInconsistentRooms(timetable) {
    let inconsistencies = 0;
    const classSubjectRooms = {};
    const classSectionRooms = {};

    // First pass: collect all room assignments by class/section and subject type
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const subjectKey = entry.course_code;
      const roomKey = entry.room_id;
      const isLab = entry.is_lab;

      // Track by subject
      if (!classSubjectRooms[classKey]) classSubjectRooms[classKey] = {};
      if (!classSubjectRooms[classKey][subjectKey]) {
        classSubjectRooms[classKey][subjectKey] = roomKey;
      } else if (classSubjectRooms[classKey][subjectKey] !== roomKey) {
        // Different room for the same subject and class
        inconsistencies += 2; // Higher penalty for subject inconsistency
      }

      // Track by class/section and room type
      if (!classSectionRooms[classKey]) {
        classSectionRooms[classKey] = {
          lecture: null,
          lab: null,
        };
      }

      if (isLab) {
        if (classSectionRooms[classKey].lab === null) {
          classSectionRooms[classKey].lab = roomKey;
        } else if (classSectionRooms[classKey].lab !== roomKey) {
          // Different lab room for the same class
          inconsistencies += 3; // Even higher penalty for class/section inconsistency
        }
      } else {
        if (classSectionRooms[classKey].lecture === null) {
          classSectionRooms[classKey].lecture = roomKey;
        } else if (classSectionRooms[classKey].lecture !== roomKey) {
          // Different lecture room for the same class
          inconsistencies += 3; // Even higher penalty for class/section inconsistency
        }
      }
    }

    return inconsistencies;
  }

  // Count violations of lab constraints (1 per week, continuous 2-hour slot)
  countLabViolations(timetable) {
    let violations = 0;
    const labEntries = timetable.filter((entry) => entry.is_lab);
    const labGroups = {};

    for (const entry of labEntries) {
      const key = `${entry.semester}-${entry.branch}-${entry.section}-${entry.course_code}-${entry.day}`;
      if (!labGroups[key]) labGroups[key] = [];
      labGroups[key].push(entry.period);
    }

    for (const key in labGroups) {
      const periods = labGroups[key].sort((a, b) => a - b);

      // Check if we have exactly 2 periods
      if (periods.length !== 2) {
        violations++;
        continue;
      }

      // Check if periods are consecutive
      if (periods[1] - periods[0] !== 1) {
        violations++;
      }
    }

    return violations;
  }

  // Count violations of lecture limits (3 per week for non-lab classes)
  countLectureLimitViolations(timetable) {
    let violations = 0;
    const classSubjectCounts = {};

    for (const entry of timetable) {
      if (entry.is_lab) continue; // Skip lab entries

      const key = `${entry.semester}-${entry.branch}-${entry.section}-${entry.course_code}`;
      if (!classSubjectCounts[key]) classSubjectCounts[key] = 0;
      classSubjectCounts[key]++;
    }

    for (const key in classSubjectCounts) {
      if (classSubjectCounts[key] > this.maxLecturesPerWeek) {
        violations += classSubjectCounts[key] - this.maxLecturesPerWeek;
      }
    }

    return violations;
  }

  countStudentGaps(timetable) {
    let totalGaps = 0;
    const classDaySchedules = {};

    // Group periods by class and day
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const dayKey = entry.day;
      if (!classDaySchedules[classKey]) classDaySchedules[classKey] = {};
      if (!classDaySchedules[classKey][dayKey])
        classDaySchedules[classKey][dayKey] = [];
      classDaySchedules[classKey][dayKey].push(entry.period);
    }

    // Calculate gaps for each class and day
    for (const classKey in classDaySchedules) {
      for (const dayKey in classDaySchedules[classKey]) {
        const periods = classDaySchedules[classKey][dayKey].sort(
          (a, b) => a - b
        );

        // Count gaps, but don't count lunch break as a gap
        for (let i = 1; i < periods.length; i++) {
          const prevPeriod = periods[i - 1];
          const currentPeriod = periods[i];

          // If gap spans lunch break, reduce the gap count by 1
          if (
            prevPeriod < this.lunchBreakPeriod &&
            currentPeriod > this.lunchBreakPeriod
          ) {
            const gap = currentPeriod - prevPeriod - 2; // -2 to account for lunch
            if (gap > 0) totalGaps += gap;
          } else {
            const gap = currentPeriod - prevPeriod - 1;
            if (gap > 0) totalGaps += gap;
          }
        }
      }
    }
    return totalGaps;
  }

  evaluateDayBalance(timetable) {
    const classDayCounts = {};
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      const dayKey = entry.day;
      if (!classDayCounts[classKey]) classDayCounts[classKey] = {};
      if (!classDayCounts[classKey][dayKey])
        classDayCounts[classKey][dayKey] = 0;
      classDayCounts[classKey][dayKey]++;
    }
    let totalStdDev = 0,
      classCount = 0;
    for (const classKey in classDayCounts) {
      const counts = Object.values(classDayCounts[classKey]);
      const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
      const variance =
        counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / counts.length;
      totalStdDev += Math.sqrt(variance);
      classCount++;
    }
    return classCount > 0 ? 10 - totalStdDev / classCount : 0;
  }

  evaluateRoomAllocation(timetable) {
    let score = 0;
    for (const entry of timetable) {
      const subject = this.subjects.find(
        (s) => s.course_code === entry.course_code
      );
      const classroom = this.classrooms.find(
        (c) => c.room_id === entry.room_id
      );
      if (subject && classroom) {
        if (subject.practical_hr > 0 && classroom.type === 'lab') score++;
        if (
          (subject.lecture_hr > 0 || subject.theory_hr > 0) &&
          classroom.type === 'lecture'
        )
          score++;
      }
    }
    return score;
  }

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

  crossover(parent1, parent2) {
    const parent1ByClass = this.groupByClass(parent1);
    const parent2ByClass = this.groupByClass(parent2);
    const child = [];
    const allClasses = new Set([
      ...Object.keys(parent1ByClass),
      ...Object.keys(parent2ByClass),
    ]);
    for (const classKey of allClasses) {
      const sourceParent =
        Math.random() < 0.5
          ? parent1ByClass[classKey] || []
          : parent2ByClass[classKey] || [];
      child.push(...sourceParent);
    }
    return child;
  }

  groupByClass(timetable) {
    const byClass = {};
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      if (!byClass[classKey]) byClass[classKey] = [];
      byClass[classKey].push(entry);
    }
    return byClass;
  }

  mutate(timetable) {
    const mutatedTimetable = [...timetable];

    // First, extract the class/section room assignments from the timetable
    const classSectionRooms = {};
    for (const entry of timetable) {
      const classKey = `${entry.semester}-${entry.branch}-${entry.section}`;
      if (!classSectionRooms[classKey]) {
        classSectionRooms[classKey] = {
          lecture: null,
          lab: null,
        };
      }

      if (entry.is_lab && !classSectionRooms[classKey].lab) {
        classSectionRooms[classKey].lab = entry.room_id;
      } else if (!entry.is_lab && !classSectionRooms[classKey].lecture) {
        classSectionRooms[classKey].lecture = entry.room_id;
      }
    }

    // Now perform mutations while preserving classroom consistency
    for (let i = 0; i < mutatedTimetable.length; i++) {
      if (Math.random() < this.mutationRate) {
        const entry = { ...mutatedTimetable[i] };
        // Only mutate day or period, not room to preserve consistency
        const mutationType = Math.floor(Math.random() * 2);

        switch (mutationType) {
          case 0: // Change day
            entry.day = this.days[Math.floor(Math.random() * this.days.length)];
            break;
          case 1: // Change period
            entry.period =
              this.periods[Math.floor(Math.random() * this.periods.length)];
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

  // Check if a teacher is blocked/unavailable for a given day and period
  isTeacherSlotBlocked(teacherId, day, period) {
    if (!teacherId) return false;
    const id = teacherId?.toString();
    const avail = this.teacherAvailability || {};
    if (!avail[id] || !avail[id][day]) return false;
    return avail[id][day].includes(period);
  }

  // Check if assigning a teacher at (day, period) would create an undesirable adjacent conflict.
  // Options:
  // - allowLabPair: allow adjacency when the adjacent session is the same lab course (continuous lab)
  // - labCourseCode: the course_code used for lab pairing checks
  teacherHasAdjacentConflict(timetable, teacherId, day, period, options = {}) {
    if (!teacherId) return false;
    const adjacent = timetable.find(
      (e) =>
        e.teacher_id === teacherId &&
        e.day === day &&
        (e.period === period - 1 || e.period === period + 1)
    );

    if (!adjacent) return false;

    if (options.allowLabPair && options.labCourseCode) {
      // Allow adjacency only if the adjacent session is the same lab course
      if (adjacent.course_code === options.labCourseCode) return false;
    }

    // Otherwise treat adjacency as a conflict
    return true;
  }

  // Count teacher availability violations in a timetable (teacher scheduled when blocked)
  countTeacherAvailabilityViolations(timetable) {
    let violations = 0;
    for (const entry of timetable) {
      if (this.isTeacherSlotBlocked(entry.teacher_id, entry.day, entry.period)) {
        violations++;
      }
    }
    return violations;
  }

  // Count excessive consecutive sessions for teachers (penalize runs longer than 2)
  countTeacherConsecutiveSessions(timetable) {
    const teacherDayPeriods = {};
    for (const entry of timetable) {
      const id = entry.teacher_id?.toString();
      if (!id) continue;
      if (!teacherDayPeriods[id]) teacherDayPeriods[id] = {};
      if (!teacherDayPeriods[id][entry.day]) teacherDayPeriods[id][entry.day] = [];
      teacherDayPeriods[id][entry.day].push(entry.period);
    }

    let violations = 0;
    for (const id in teacherDayPeriods) {
      for (const day in teacherDayPeriods[id]) {
        const periods = Array.from(new Set(teacherDayPeriods[id][day])).sort((a, b) => a - b);
        let runLength = 1;
        for (let i = 1; i < periods.length; i++) {
          if (periods[i] === periods[i - 1] + 1) {
            runLength++;
          } else {
            if (runLength > 2) violations += runLength - 2;
            runLength = 1;
          }
        }
        if (runLength > 2) violations += runLength - 2;
      }
    }
    return violations;
  }

  // Run the genetic algorithm
  run() {
    let population = this.generateInitialPopulation();
    let fitnesses = population.map((timetable) =>
      this.evaluateFitness(timetable)
    );

    let bestIndex = fitnesses.indexOf(Math.max(...fitnesses));
    let bestTimetable = population[bestIndex];
    let bestFitness = fitnesses[bestIndex];

    for (let generation = 0; generation < this.maxGenerations; generation++) {
      const newPopulation = [];

      // Elitism
      const sortedIndices = fitnesses
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .map((item) => item.index);

      for (let i = 0; i < this.elitismCount; i++) {
        newPopulation.push(population[sortedIndices[i]]);
      }

      // Fill rest with offspring
      while (newPopulation.length < this.populationSize) {
        const parent1 = this.tournamentSelection(population, fitnesses);
        const parent2 = this.tournamentSelection(population, fitnesses);

        let offspring = this.crossover(parent1, parent2);
        offspring = this.mutate(offspring);

        newPopulation.push(offspring);
      }

      population = newPopulation;
      fitnesses = population.map((timetable) =>
        this.evaluateFitness(timetable)
      );

      bestIndex = fitnesses.indexOf(Math.max(...fitnesses));
      if (fitnesses[bestIndex] > bestFitness) {
        bestTimetable = population[bestIndex];
        bestFitness = fitnesses[bestIndex];
      }

      if (this.countConflicts(bestTimetable) === 0) break;
    }

    return bestTimetable;
  }
}

// Generate timetable for a single class
ipcMain.on(
  'generate-timetable',
  async (event, { semester, branch, section }) => {
    try {
      if (!semester || !branch || !section) {
        event.reply('generate-timetable-response', {
          success: false,
          message: 'Semester, Branch, and Section are required',
        });
        return;
      }

      const assignments =
        await teachingAssignmentQueries.getTeachingAssignmentsByClass(
          semester,
          branch,
          section
        );
      if (assignments.length === 0) {
        event.reply('generate-timetable-response', {
          success: false,
          message: 'No teaching assignments found for this class',
        });
        return;
      }

      const classrooms = await classroomQueries.getAllClassrooms();
      if (classrooms.length === 0) {
        event.reply('generate-timetable-response', {
          success: false,
          message: 'No classrooms available',
        });
        return;
      }

      const subjects = await subjectQueries.getAllSubjects();
      const availabilityRecords =
        await teacherAvailabilityQueries.getAllTeacherAvailability();
      const teacherAvailabilityLookup =
        buildTeacherAvailabilityLookup(availabilityRecords);

      const ga = new GeneticAlgorithm(
        assignments,
        classrooms,
        subjects,
        teacherAvailabilityLookup
      );
      const timetable = ga.run();

      await timetableQueries.clearClassTimetable(semester, branch, section);
      for (const entry of timetable) {
        await timetableQueries.saveTimetableEntry(entry);
      }

      event.reply('generate-timetable-response', {
        success: true,
        message: 'Timetable generated successfully',
      });
    } catch (error) {
      console.error('Error generating timetable:', error);
      event.reply('generate-timetable-response', {
        success: false,
        message: `Error generating timetable: ${error.message}`,
      });
    }
  }
);

// Generate all timetables (bulk)
ipcMain.on('generate-all-timetables', async (event) => {
  try {
    const allClasses = await classQueries.getAllClasses();
    const classrooms = await classroomQueries.getAllClassrooms();
    const subjects = await subjectQueries.getAllSubjects();
    const availabilityRecords =
      await teacherAvailabilityQueries.getAllTeacherAvailability();
    const teacherAvailabilityLookup =
      buildTeacherAvailabilityLookup(availabilityRecords);

    for (const cls of allClasses) {
      const { semester, branch, section } = cls;
      const classKey = `${semester}-${branch}-${section}`;

      event.sender.send('generate-all-timetables-progress', {
        classKey,
        message: 'Fetching assignments...',
      });

      const assignments =
        await teachingAssignmentQueries.getTeachingAssignmentsByClass(
          semester,
          branch,
          section
        );
      if (!assignments || assignments.length === 0) {
        event.sender.send('generate-all-timetables-progress', {
          classKey,
          message: 'Skipped: No assignments',
        });
        continue;
      }

      const ga = new GeneticAlgorithm(
        assignments,
        classrooms,
        subjects,
        teacherAvailabilityLookup
      );
      const timetable = ga.run();

      await timetableQueries.clearClassTimetable(semester, branch, section);
      for (const entry of timetable) {
        await timetableQueries.saveTimetableEntry(entry);
      }

      event.sender.send('generate-all-timetables-progress', {
        classKey,
        message: 'Completed',
      });
    }

    event.reply('generate-all-timetables-response', {
      success: true,
      message: 'All timetables generated successfully',
    });
  } catch (error) {
    console.error('Error generating all timetables:', error);
    event.reply('generate-all-timetables-response', {
      success: false,
      message: `Error generating all timetables: ${error.message}`,
    });
  }
});

// Get class timetable
ipcMain.on(
  'get-class-timetable',
  async (event, { semester, branch, section }) => {
    try {
      const timetable = await timetableQueries.getClassTimetable(
        semester,
        branch,
        section
      );
      event.reply('get-class-timetable-response', {
        success: true,
        data: timetable,
      });
    } catch (error) {
      event.reply('get-class-timetable-response', {
        success: false,
        message: `Error: ${error.message}`,
      });
    }
  }
);

// Get teacher timetable
ipcMain.on('get-teacher-timetable', async (event, teacherId) => {
  try {
    const timetable = await timetableQueries.getTeacherTimetable(teacherId);
    event.reply('get-teacher-timetable-response', {
      success: true,
      data: timetable,
    });
  } catch (error) {
    event.reply('get-teacher-timetable-response', {
      success: false,
      message: `Error: ${error.message}`,
    });
  }
});

// Get classroom timetable
ipcMain.on('get-classroom-timetable', async (event, roomId) => {
  try {
    const timetable = await timetableQueries.getClassroomTimetable(roomId);
    event.reply('get-classroom-timetable-response', {
      success: true,
      data: timetable,
    });
  } catch (error) {
    event.reply('get-classroom-timetable-response', {
      success: false,
      message: `Error: ${error.message}`,
    });
  }
});

// Clear class timetable
ipcMain.on(
  'clear-class-timetable',
  async (event, { semester, branch, section }) => {
    try {
      await timetableQueries.clearClassTimetable(semester, branch, section);
      event.reply('clear-class-timetable-response', {
        success: true,
        message: 'Timetable cleared successfully',
      });
    } catch (error) {
      event.reply('clear-class-timetable-response', {
        success: false,
        message: `Error: ${error.message}`,
      });
    }
  }
);

// Clear all timetables
ipcMain.on('clear-all-timetables', async (event) => {
  try {
    await timetableQueries.clearAllTimetables();
    event.reply('clear-all-timetables-response', {
      success: true,
      message: 'All timetables cleared successfully',
    });
  } catch (error) {
    event.reply('clear-all-timetables-response', {
      success: false,
      message: `Error: ${error.message}`,
    });
  }
});

console.log('Timetable IPC handlers registered');

function buildTeacherAvailabilityLookup(records = []) {
  const availability = {};
  (records || []).forEach((record) => {
    const teacherId = record.teacher_id?.toString();
    if (!teacherId) return;

    if (!availability[teacherId]) {
      availability[teacherId] = {};
    }

    if (!availability[teacherId][record.day]) {
      availability[teacherId][record.day] = [];
    }

    if (record.period != null) {
      availability[teacherId][record.day].push(record.period);
    }
  });

  return availability;
}
