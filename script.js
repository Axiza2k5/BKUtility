/**
 * IUtility - University Schedule Planner
 * A comprehensive calendar application for managing university course schedules
 * 
 * Features:
 * - Subject-based class selection with toggle functionality
 * - Conflict detection and validation
 * - Export functionality
 * - Responsive design with accessibility support
 */

class IUtility {
    constructor() {
        this.calendar = null;
        this.subjects = new Map(); // Map of subject name to classes
        this.selectedClasses = new Map(); // Map of subject name to selected class
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.initializeCalendar();
        this.attachEventListeners();
        this.initializeTheme();
        this.loadFromStorage();
        
        console.log('IUtility initialized successfully');
    }

    /**
     * Initialize FullCalendar with configuration
     */
    initializeCalendar() {
        const calendarEl = document.getElementById('uniCalendar');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            firstDay: 1, // Monday first
            slotMinTime: '07:00:00',
            slotMaxTime: '22:00:00',
            height: 'auto',
            allDaySlot: false,
            weekNumbers: true,
            weekNumberFormat: { week: 'numeric' },
            
            // Event styling
            eventDidMount: (info) => {
                const event = info.event;
                info.el.setAttribute('tabindex', '0');
                info.el.setAttribute('role', 'button');
                info.el.setAttribute('aria-label', 
                    `${event.title} - ${event.extendedProps.classCode} - ${event.extendedProps.room}`
                );
            },
            
            // Responsive behavior
            windowResize: () => {
                if (window.innerWidth < 768) {
                    this.calendar.changeView('timeGridDay');
                } else {
                    this.calendar.changeView('timeGridWeek');
                }
            }
        });
        
        this.calendar.render();
        
        // Set initial view based on screen size
        if (window.innerWidth < 768) {
            this.calendar.changeView('timeGridDay');
        }
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Parse sections button
        document.getElementById('parseSections').addEventListener('click', () => {
            this.parseClasses();
        });

        // Control panel buttons
        document.getElementById('exportIcs').addEventListener('click', () => {
            this.exportIcs();
        });

        document.getElementById('clearSchedule').addEventListener('click', () => {
            this.clearSchedule();
        });

        // Theme toggle button
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    /**
     * Parse textarea input and create subject cards with classes
     */
    parseClasses() {
        const rawInput = document.getElementById('rawInput').value.trim();
        // console.log('Parsing classes from input:\n', rawInput);
    
        // console.log('Raw input length:', rawInput.length);
        if (!rawInput) {
            this.showToast('Please enter course data to parse', 'warning');
            return;
        }

        const lines = rawInput.split('\n').filter(line => line.trim());
        // const subjectList = document.getElementById('subjectList');
        
        let parsedCount = 0;
        let classCode;
        let nthTimeSlot = 0;
        let n = 1;
        // console.log('Subject Name:', subjectName);

        for (let i = 0; i < n; i += 1) {
            try {
                const parsedClass = this.parseLine(lines, i);

                if(!this.subjects.has(parsedClass.subjectName)) {
                    this.subjects.set(parsedClass.subjectName, new Map());
                }

                const subjectClasses = this.subjects.get(parsedClass.subjectName);
                if (!subjectClasses.has(parsedClass.classCode)) {
                    subjectClasses.set(parsedClass.classCode, {
                        classCode: parsedClass.classCode,
                        subjectname: parsedClass.subjectName,
                        timeSlots: []
                    });
                }

                let ClassData = {
                    title: parsedClass.subjectName,                     //
                    subjectname: parsedClass.subjectName,               //
                    classCode: parsedClass.classCode,                   //
                    days: parsedClass.days,
                    startTime: parsedClass.startTime,
                    period: parsedClass.period,
                    room: parsedClass.room,
                    weeks: parsedClass.weeks,
                    hours: parsedClass.hours,
                    minutes: parsedClass.minutes,
                    notes: parsedClass.subjectCode + "\n" + parsedClass.classCode.split('_')[nthTimeSlot] + "\n" + parsedClass.notes,
                    timeSlot: parsedClass.timeSlot
                }
                n = parsedClass.classnumber;

                nthTimeSlot++;
                subjectClasses.get(parsedClass.classCode).timeSlots.push(ClassData);
                parsedCount++;

            } catch (error) {
                console.error(`Error parsing line ${i + 1}:`, error);
                this.showToast(`Error parsing line ${i + 1}: ${error.message}`, 'danger');
            }
        }

        if (parsedCount > 0) {
            this.createSubjectCards();
            this.showToast(`Successfully parsed ${parsedCount} time slots for ${this.subjects.size} subjects`, 'success');
            // Clear input section after successful parsing
            document.getElementById('rawInput').value = '';
        } else {
            this.showToast('No valid classes found', 'warning');
        }
    }

    /**
     * Parse a single line of course data
     * @param {string} line - Raw course data line
     * @returns {Object} Parsed class data
     * 
     */
    parseLine(lines, i) {
        // if (!line || !line.includes('|')) {
        //     throw new Error('Invalid line format - missing separators');
        // }


        // const parts = line.split('\t').map(s => s.trim());
        // if (parts.length !== 8) {
        //     throw new Error(`Expected 8 parts, got ${parts.length}`);
        // }

        // Thứ 4	- - - - - - - 8 9 10 11 12 - - - -	C6-103	1		------7-9-1-3-5-7-------------
        // Thứ 6	- - - - - - - 8 9 - - - - - - -	C5-503	1		12--56789-12345678------------

        // const [subjectname, classCode, daysStr, timeStr, periodStr, room, weeksStr, notes] = parts;
        // IT013IU	Algorithms & Data Structures	02	4	ITIT23WE41	4		
        // 01
        // Ba
        // Tư
        // 1
        // 7
        // 3
        // 3
        // ONLINE1
        // A2.205
        // 0850
        // 0879
        // 06/10/2025--14/12/2025
        // 08/09/2025--21/12/2025

        // const [daysStr, timeStr, room, _, __, weeksStr] = parts;
        let classnumber = 1;
        let classCode = lines[0].split('\t')[2].trim();
        let subjectName = lines[0].split('\t')[1].trim();
        if (isNaN(parseInt(lines[3], 10))) {
            classnumber = 2;
        }

        const days = [];
        const dayMap = {
            'Hai': 1,
            'Ba': 2,
            'Tư': 3,
            'Năm': 4,
            'Sáu': 5,
            'Bảy': 6,
            'Chủ nhật': 7
        };
        if (dayMap.hasOwnProperty(lines[2+i].trim())) {
            days.push(dayMap[lines[2+i].trim()]);
        } else {
            throw new Error(`Unknown day: ${lines[2+i]}`);
        }


        // Parse time (HH:mm format)
        // const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        // if (!timeMatch) {
        //     throw new Error(`Invalid time format: ${timeStr}`);
        // }
        let timeStr = parseInt(lines[2 + 1 * classnumber + i].trim(), 10);
        let extend_map = [0, 0, 0, 0, 5, 0, 0, 10, 0, 0, 5, 0, 0]
        let hours_map = [0, 8, 8, 9, 10, 11, 12, 13, 14, 14, 15, 16, 17]
        let minutes_map = [0, 0, 50, 40, 35, 25, 15, 15, 5, 55, 50, 40, 30]
        let period = parseInt(lines[2 + 2 * classnumber + i].trim(), 10) * 50;
        for(let j = timeStr+1; j < timeStr + parseInt(lines[2 + 2 * classnumber + i].trim(), 10); j++) {
            period += extend_map[j];
        }

        const hours = hours_map[timeStr];
        const minutes = minutes_map[timeStr];

        // Parse period (minutes)
        // const period = parseInt(periodStr, 10);
        // if (isNaN(period) || period <= 0) {
        //     throw new Error(`Invalid period: ${periodStr}`);
        // }

        // Parse weeks (52 character string, digits indicate active weeks)
        let weeksStr;
        try{
            weeksStr = lines[2 + 5 * classnumber + i].trim();
        }
        catch(e){
            weeksStr = lines[2 + 4 * classnumber + i].trim();
        }
        const weeks = [];
        weeksStr.split('').forEach((ch, idx) => {
            if(ch === '-')
                ;
            else weeks.push(idx+36);
        });

        let room = lines[2 + 3 * classnumber + i].trim();
        // if (/online/i.test(room))

        if (weeks.length === 0) {
            throw new Error('No active weeks found');
        }

        return {
            classnumber,
            classCode,
            subjectName,
            days,
            startTime: `${hours.toString().padStart(2, '0')}:00`,
            period,
            room,
            weeks,
            hours,
            minutes,
            notes: '', // Notes field (optional)
            // Create unique identifier for class time slots
            timeSlot: '${classCode}-${days.toString}-${hours}:00-${room}'
        };
    }
    // parseLine(line) {
    //     if (!line || !line.includes('|')) {
    //         throw new Error('Invalid line format - missing separators');
    //     }

    //     const parts = line.split('|').map(s => s.trim());
    //     if (parts.length !== 8) {
    //         throw new Error(`Expected 8 parts, got ${parts.length}`);
    //     }

    //     const [subjectname, classCode, daysStr, timeStr, periodStr, room, weeksStr, notes] = parts;

    //     // Validate required fields (notes is optional)
    //     if (!subjectname || !classCode || !daysStr || !timeStr || !periodStr || !room || !weeksStr) {
    //         throw new Error('Missing required fields');
    //     }

    //     // Parse days (1-7, space separated)
    //     const days = daysStr.split(/\s+/).map(d => {
    //         const day = parseInt(d, 10);
    //         if (isNaN(day) || day < 1 || day > 7) {
    //             throw new Error(`Invalid day: ${d}`);
    //         }
    //         return day;
    //     });

    //     // Parse time (HH:mm format)
    //     const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    //     if (!timeMatch) {
    //         throw new Error(`Invalid time format: ${timeStr}`);
    //     }
    //     const hours = parseInt(timeMatch[1], 10);
    //     const minutes = parseInt(timeMatch[2], 10);
    //     if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    //         throw new Error(`Invalid time values: ${timeStr}`);
    //     }

    //     // Parse period (minutes)
    //     const period = parseInt(periodStr, 10);
    //     if (isNaN(period) || period <= 0) {
    //         throw new Error(`Invalid period: ${periodStr}`);
    //     }

    //     // Parse weeks (52 character string, digits indicate active weeks)
    //     if (weeksStr.length !== 52) {
    //         throw new Error(`Weeks string must be exactly 52 characters, got ${weeksStr.length}`);
    //     }
        
    //     const weeks = [];
    //     weeksStr.split('').forEach((ch, idx) => {
    //         if (/\d/.test(ch) && ch !== '0') {
    //             weeks.push(idx + 1);
    //         }
    //     });

    //     if (weeks.length === 0) {
    //         throw new Error('No active weeks found');
    //     }

    //     return {
    //         title: subjectname,
    //         subjectname,
    //         classCode,
    //         days,
    //         startTime: timeStr,
    //         period,
    //         room,
    //         weeks,
    //         hours,
    //         minutes,
    //         notes: notes || '', // Notes field (optional)
    //         // Create unique identifier for class time slots
    //         timeSlot: `${classCode}-${daysStr}-${timeStr}-${room}`
    //     };
    // }

    /**
     * Create subject cards with expandable class lists
     */
    createSubjectCards() {
        const container = document.getElementById('subjectList');
        
        // Clear existing subject cards to prevent duplicates
        container.innerHTML = '';
        
        this.subjects.forEach((classesMap, subjectName) => {
            const subjectCard = document.createElement('div');
            subjectCard.className = 'subject-card';
            subjectCard.setAttribute('tabindex', '0');
            subjectCard.setAttribute('role', 'button');
            
            const totalClasses = classesMap.size;
            const totalTimeSlots = Array.from(classesMap.values()).reduce((sum, classGroup) => sum + classGroup.timeSlots.length, 0);
            
            subjectCard.setAttribute('aria-label', `Subject: ${subjectName} (${totalClasses} classes, ${totalTimeSlots} time slots)`);
            subjectCard.setAttribute('aria-expanded', 'false');
            
            subjectCard.innerHTML = `
                <div class="section-title">${subjectName}</div>
                <div class="section-details">
                    <div><strong>Available Classes:</strong> ${totalClasses}</div>
                    <div><small>Click to expand/collapse</small></div>
                </div>
                <div class="class-list" style="display: none;">
                    ${Array.from(classesMap.values()).map(classGroup => {
                        const timeSlotsList = classGroup.timeSlots.map(timeSlot => {
                            const daysText = timeSlot.days.map(d => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ');
                            const weeksCount = timeSlot.weeks.length;
                            
                            return `
                                <div class="time-slot-item" style="margin-left: 15px; padding: 5px; border-left: 2px solid #007bff;">
                                    <div><strong>Days:</strong> ${daysText}</div>
                                    <div><strong>Time:</strong> ${timeSlot.startTime} (${timeSlot.period} min)</div>
                                    <div><strong>Room:</strong> ${timeSlot.room}</div>
                                    <div><strong>Weeks:</strong> ${weeksCount} weeks</div>
                                    ${timeSlot.notes ? `<div><strong>Notes:</strong> ${timeSlot.notes}</div>` : ''}
                                </div>
                            `;
                        }).join('');
                        
                        return `
                            <div class="class-item" data-class-code="${classGroup.classCode}" data-subject="${subjectName}">
                                <div><strong>${classGroup.classCode}</strong></div>
                                ${timeSlotsList}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click event for expanding/collapsing
            subjectCard.addEventListener('click', (e) => {
                if (!e.target.closest('.class-item')) {
                    this.toggleSubjectExpansion(subjectCard, subjectName);
                }
            });

            // Add click events for class selection
            subjectCard.querySelectorAll('.class-item').forEach(classItem => {
                classItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleClassSelection(classItem, subjectName);
                });
            });

            container.appendChild(subjectCard);
        });

        // Update conflict indicators after creating cards
        setTimeout(() => this.updateConflictIndicators(), 100);
    }

    /**
     * Toggle subject card expansion
     */
    toggleSubjectExpansion(subjectCard, subjectName) {
        const classList = subjectCard.querySelector('.class-list');
        const isExpanded = classList.style.display !== 'none';
        
        if (isExpanded) {
            classList.style.display = 'none';
            subjectCard.classList.remove('expanded');
            subjectCard.setAttribute('aria-expanded', 'false');
        } else {
            classList.style.display = 'block';
            subjectCard.classList.add('expanded');
            subjectCard.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Toggle class selection within a subject
     */
    toggleClassSelection(classItem, subjectName) {
        const classCode = classItem.getAttribute('data-class-code');
        const isSelected = classItem.classList.contains('selected');
        
        if (isSelected) {
            // Deselect class - remove all time slots for this class
            classItem.classList.remove('selected');
            this.selectedClasses.delete(subjectName);
            this.updateCalendarForSubject(subjectName);
            this.showToast(`Removed ${classCode} from ${subjectName}`, 'info');
        } else {
            // Check for conflicts before allowing selection
            const classGroup = this.subjects.get(subjectName).get(classCode);
            const conflictInfo = this.checkForConflicts(classGroup.timeSlots, subjectName);
            
            if (conflictInfo) {
                // Prevent selection due to conflict
                this.showToast(`Cannot select ${classCode}: Time conflict with ${conflictInfo.conflictSubject} at ${conflictInfo.conflictTime}`, 'danger');
                return; // Exit without selecting
            }
            
            // Check if another class is already selected for this subject
            const subjectCard = classItem.closest('.subject-card');
            const currentlySelected = subjectCard.querySelector('.class-item.selected');
            
            if (currentlySelected) {
                // Deselect the previously selected class
                currentlySelected.classList.remove('selected');
                const previousClassCode = currentlySelected.getAttribute('data-class-code');
                this.showToast(`Switched from ${previousClassCode} to ${classCode} in ${subjectName}`, 'info');
            }
            
            // Select new class - add all time slots for this class
            classItem.classList.add('selected');
            
            this.selectedClasses.set(subjectName, {
                subjectname: subjectName,
                classCode: classCode,
                timeSlots: classGroup.timeSlots
            });
            
            this.updateCalendarForSubject(subjectName);
            
            if (!currentlySelected) {
                this.showToast(`Added ${classCode} to ${subjectName}`, 'success');
            }
        }
    }

    /**
     * Update calendar for a specific subject (handles multiple time slots)
     */
    updateCalendarForSubject(subjectName) {
        // Remove existing events for this subject
        this.removeClassFromCalendar(subjectName);
        
        // Add events for all selected time slots of this subject
        const selectedClass = this.selectedClasses.get(subjectName);
        if (selectedClass && selectedClass.timeSlots) {
            selectedClass.timeSlots.forEach((timeSlot, index) => {
                // Skip removal for all but the first time slot since we already removed above
                this.addClassToCalendar(timeSlot, index > 0);
            });
        }

        // Update conflict indicators for all unselected subjects
        setTimeout(() => this.updateConflictIndicators(), 100);
    }

    /**
     * Add a class to the calendar (single time slot)
     */
    addClassToCalendar(classData, skipRemoval = false) {
        // Remove any existing events for this subject (unless skipped for batch operations)
        if (!skipRemoval) {
            this.removeClassFromCalendar(classData.subjectname);
        }
        
        // Calculate all occurrences for each day and week combination
        classData.days.forEach(dayOfWeek => {
            classData.weeks.forEach(weekNum => {
                // Calculate the date for this specific week and day
                const yearStart = new Date(new Date().getFullYear(), 0, 1);
                const week1Monday = this.startOfWeek(yearStart, { weekStartsOn: 1 });
                const targetWeekMonday = this.addWeeks(week1Monday, weekNum - 1);
                const targetDate = this.addDays(targetWeekMonday, dayOfWeek - 1);
                
                // Set the time
                const [hours, minutes] = classData.startTime.split(':').map(Number);
                const startTime = this.setHours(this.setMinutes(targetDate, minutes), hours);
                const endTime = this.addMinutes(startTime, classData.period);
                
                // Check for conflicts before adding
                if (this.hasTimeConflict(startTime, endTime, classData.subjectname)) {
                    this.showToast(`Time conflict detected for ${classData.subjectname} on ${this.formatDate(startTime, 'MMM dd')}`, 'warning');
                    return;
                }
                
                // Add event to calendar
                this.calendar.addEvent({
                    id: `${classData.subjectname}-${classData.timeSlot}-${weekNum}-${dayOfWeek}`,
                    title: `${classData.subjectname} (${classData.classCode})`,
                    start: startTime,
                    end: endTime,
                    extendedProps: {
                        ...classData,
                        weekNum,
                        dayOfWeek
                    }
                });
            });
        });
    }

    /**
     * Remove all events for a subject from the calendar
     */
    removeClassFromCalendar(subjectName) {
        const events = this.calendar.getEvents();
        events.forEach(event => {
            if (event.extendedProps.subjectname === subjectName || event.title.startsWith(subjectName)) {
                event.remove();
            }
        });
    }

    /**
     * Check for time conflicts with existing events
     */
    hasTimeConflict(newStart, newEnd, excludeSubject) {
        const existingEvents = this.calendar.getEvents().filter(evt => 
            evt.extendedProps.subjectname !== excludeSubject
        );

        const newStartTime = newStart.getTime();
        const newEndTime = newEnd.getTime();

        for (const event of existingEvents) {
            const existingStart = event.start.getTime();
            const existingEnd = event.end.getTime();

            if (newStartTime < existingEnd && newEndTime > existingStart) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for conflicts before allowing class selection
     * @param {Array} timeSlots - Array of time slots to check
     * @param {string} excludeSubject - Subject to exclude from conflict check
     * @returns {Object|null} Conflict information or null if no conflicts
     */
    checkForConflicts(timeSlots, excludeSubject) {
        const existingEvents = this.calendar.getEvents().filter(evt => 
            evt.extendedProps.subjectname !== excludeSubject
        );

        // Check each time slot for conflicts
        for (const timeSlot of timeSlots) {
            for (const dayOfWeek of timeSlot.days) {
                for (const weekNum of timeSlot.weeks) {
                    // Calculate the date for this specific week and day
                    const yearStart = new Date(new Date().getFullYear(), 0, 1);
                    const week1Monday = this.startOfWeek(yearStart, { weekStartsOn: 1 });
                    const targetWeekMonday = this.addWeeks(week1Monday, weekNum - 1);
                    const targetDate = this.addDays(targetWeekMonday, dayOfWeek - 1);
                    
                    // Set the time
                    const [hours, minutes] = timeSlot.startTime.split(':').map(Number);
                    const newStart = this.setHours(this.setMinutes(targetDate, minutes), hours);
                    const newEnd = this.addMinutes(newStart, timeSlot.period);
                    
                    const newStartTime = newStart.getTime();
                    const newEndTime = newEnd.getTime();

                    // Check against existing events
                    for (const event of existingEvents) {
                        const existingStart = event.start.getTime();
                        const existingEnd = event.end.getTime();

                        if (newStartTime < existingEnd && newEndTime > existingStart) {
                            // Found a conflict - return conflict information
                            const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            return {
                                conflictSubject: event.extendedProps.subjectname,
                                conflictTime: `${dayNames[dayOfWeek]} ${timeSlot.startTime}`
                            };
                        }
                    }
                }
            }
        }

        return null; // No conflicts found
    }

    /**
     * Check all unselected subjects for conflicts and update visual indicators
     */
    updateConflictIndicators() {
        // Get all existing calendar events for conflict checking
        const existingEvents = this.calendar.getEvents();
        
        // Clear existing conflict indicators
        document.querySelectorAll('.time-slot-item.conflict').forEach(el => {
            el.classList.remove('conflict');
        });
        document.querySelectorAll('.class-item.has-conflicts').forEach(el => {
            el.classList.remove('has-conflicts');
        });
        document.querySelectorAll('.conflict-indicator').forEach(el => {
            el.remove();
        });

        // Check each subject and class for conflicts
        this.subjects.forEach((classesMap, subjectName) => {
            // Skip subjects that are already selected
            if (this.selectedClasses.has(subjectName)) {
                return;
            }

            classesMap.forEach((classGroup, classCode) => {
                let hasConflicts = false;
                const conflictingTimeSlots = [];

                // Check each time slot in this class for conflicts
                classGroup.timeSlots.forEach((timeSlot, timeSlotIndex) => {
                    const conflicts = this.checkTimeSlotConflicts(timeSlot, existingEvents);
                    if (conflicts.length > 0) {
                        hasConflicts = true;
                        conflictingTimeSlots.push({
                            timeSlotIndex,
                            conflicts
                        });
                    }
                });

                // Update visual indicators if conflicts found
                if (hasConflicts) {
                    this.markClassAsConflicting(subjectName, classCode, conflictingTimeSlots);
                }
            });
        });
    }

    /**
     * Check if a specific time slot conflicts with existing events
     * @param {Object} timeSlot - Time slot to check
     * @param {Array} existingEvents - Array of existing calendar events
     * @returns {Array} Array of conflicting events
     */
    checkTimeSlotConflicts(timeSlot, existingEvents) {
        const conflicts = [];

        for (const dayOfWeek of timeSlot.days) {
            for (const weekNum of timeSlot.weeks) {
                // Calculate the date for this specific week and day
                const yearStart = new Date(new Date().getFullYear(), 0, 1);
                const week1Monday = this.startOfWeek(yearStart, { weekStartsOn: 1 });
                const targetWeekMonday = this.addWeeks(week1Monday, weekNum - 1);
                const targetDate = this.addDays(targetWeekMonday, dayOfWeek - 1);
                
                // Set the time
                const [hours, minutes] = timeSlot.startTime.split(':').map(Number);
                const newStart = this.setHours(this.setMinutes(targetDate, minutes), hours);
                const newEnd = this.addMinutes(newStart, timeSlot.period);
                
                const newStartTime = newStart.getTime();
                const newEndTime = newEnd.getTime();

                // Check against existing events
                for (const event of existingEvents) {
                    const existingStart = event.start.getTime();
                    const existingEnd = event.end.getTime();

                    if (newStartTime < existingEnd && newEndTime > existingStart) {
                        const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        conflicts.push({
                            conflictSubject: event.extendedProps.subjectname,
                            conflictTime: `${dayNames[dayOfWeek]} ${timeSlot.startTime}`,
                            dayOfWeek,
                            weekNum
                        });
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * Mark a class as having conflicts with visual indicators
     * @param {string} subjectName - Name of the subject
     * @param {string} classCode - Code of the class
     * @param {Array} conflictingTimeSlots - Array of conflicting time slots with details
     */
    markClassAsConflicting(subjectName, classCode, conflictingTimeSlots) {
        const classItem = document.querySelector(`[data-subject="${subjectName}"][data-class-code="${classCode}"]`);
        if (!classItem) return;

        // Mark the class item as having conflicts
        classItem.classList.add('has-conflicts');

        // Mark individual time slots as conflicting
        const timeSlotElements = classItem.querySelectorAll('.time-slot-item');
        
        conflictingTimeSlots.forEach(({ timeSlotIndex, conflicts }) => {
            const timeSlotElement = timeSlotElements[timeSlotIndex];
            if (timeSlotElement) {
                timeSlotElement.classList.add('conflict');
                
                // Create unique conflict messages (avoid duplicates)
                const uniqueConflicts = new Map();
                conflicts.forEach(conflict => {
                    const key = `${conflict.conflictSubject}-${conflict.conflictTime}`;
                    if (!uniqueConflicts.has(key)) {
                        uniqueConflicts.set(key, conflict);
                    }
                });
                
                // Add conflict details (unique messages only)
                const conflictInfo = Array.from(uniqueConflicts.values())
                    .map(conflict => `Conflicts with ${conflict.conflictSubject} at ${conflict.conflictTime}`)
                    .join('; ');
                
                const conflictIndicator = document.createElement('div');
                conflictIndicator.className = 'conflict-indicator';
                conflictIndicator.textContent = conflictInfo;
                timeSlotElement.appendChild(conflictIndicator);
            }
        });
    }

    /**
     * Save current schedule to localStorage
     */
    saveToStorage() {
        try {
            const selectedClassesData = {};
            this.selectedClasses.forEach((classData, subjectName) => {
                selectedClassesData[subjectName] = classData;
            });

            // Convert nested Maps to objects for JSON serialization
            const subjectsData = [];
            this.subjects.forEach((classesMap, subjectName) => {
                const classesObj = {};
                classesMap.forEach((classGroup, classCode) => {
                    classesObj[classCode] = classGroup;
                });
                subjectsData.push([subjectName, classesObj]);
            });

            const data = {
                subjects: subjectsData,
                selectedClasses: selectedClassesData,
                rawInput: document.getElementById('rawInput').value,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('IUtility-schedule', JSON.stringify(data));
            this.showToast('Schedule saved successfully', 'success');
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Failed to save schedule', 'danger');
        }
    }

    /**
     * Load schedule from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('IUtility-schedule');
            if (!saved) {
                return;
            }

            const data = JSON.parse(saved);
            
            // Clear current state
            this.calendar.getEvents().forEach(event => event.remove());
            this.subjects.clear();
            this.selectedClasses.clear();
            
            // Load subjects - handle both old and new formats
            if (data.subjects) {
                if (Array.isArray(data.subjects)) {
                    // Handle old format (array of entries)
                    const subjectsArray = data.subjects;
                    subjectsArray.forEach(([subjectName, classes]) => {
                        if (Array.isArray(classes)) {
                            // Old format: classes is an array
                            const classesMap = new Map();
                            classes.forEach(classData => {
                                const classCode = classData.classCode;
                                if (!classesMap.has(classCode)) {
                                    classesMap.set(classCode, {
                                        classCode: classCode,
                                        subjectname: subjectName,
                                        timeSlots: []
                                    });
                                }
                                classesMap.get(classCode).timeSlots.push(classData);
                            });
                            this.subjects.set(subjectName, classesMap);
                        } else {
                            // New format: classes is already a Map
                            this.subjects.set(subjectName, new Map(Object.entries(classes)));
                        }
                    });
                } else {
                    // Handle new format directly
                    this.subjects = new Map(data.subjects);
                }
            }

            // Load selected classes
            if (data.selectedClasses) {
                Object.entries(data.selectedClasses).forEach(([subjectName, classData]) => {
                    this.selectedClasses.set(subjectName, classData);
                    if (classData.timeSlots) {
                        // Handle new format with multiple time slots
                        classData.timeSlots.forEach((timeSlot, index) => {
                            // Skip removal for all but the first time slot
                            this.addClassToCalendar(timeSlot, index > 0);
                        });
                    } else {
                        // Handle old format (single class)
                        this.addClassToCalendar(classData);
                    }
                });
            }

            // Load raw input
            if (data.rawInput) {
                document.getElementById('rawInput').value = data.rawInput;
            }

            // Recreate subject cards if subjects exist
            if (this.subjects.size > 0) {
                this.createSubjectCards();
                // Restore selected states
                this.selectedClasses.forEach((selectedClass, subjectName) => {
                    const classItem = document.querySelector(`[data-subject="${subjectName}"][data-class-code="${selectedClass.classCode}"]`);
                    if (classItem) {
                        classItem.classList.add('selected');
                    }
                });
                
                // Update conflict indicators after loading
                setTimeout(() => this.updateConflictIndicators(), 100);
            }

            this.showToast('Schedule loaded successfully', 'success');
        } catch (error) {
            console.error('Load error:', error);
            this.showToast('Failed to load schedule', 'danger');
        }
    }

    /**
     * Export schedule as .ics file
     */
    exportIcs() {
        try {
            const events = this.calendar.getEvents();

            if (events.length === 0) {
                this.showToast('No events to export', 'warning');
                return;
            }

            // Use our reliable manual ICS creation
            this.createIcsFile(events);
            this.showToast('ICS file exported successfully', 'success');
        } catch (error) {
            console.error('Export ICS error:', error);
            this.showToast('Failed to export ICS file', 'danger');
        }
    }

    /**
     * Create and download ICS file
     */
    createIcsFile(events) {
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//IUtility//University Schedule Planner//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        events.forEach((event, index) => {
            const start = event.start;
            const end = event.end || this.addMinutes(start, event.extendedProps.period || 60);
            
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}${month}${day}T${hours}${minutes}${seconds}`;
            };

            const uid = `${Date.now()}-${index}@IUtility.local`;
            const created = formatDate(new Date());
            
            // Escape special characters in text fields
            const escapeText = (text) => {
                return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
            };

            const summary = escapeText(event.extendedProps.subjectname || event.title);
            const notesText = event.extendedProps.notes ? `\\nNotes: ${event.extendedProps.notes}` : '';
            const description = escapeText(`Class Code: ${event.extendedProps.classCode || 'N/A'}\\nRoom: ${event.extendedProps.room || 'N/A'}${notesText}`);
            const location = escapeText(event.extendedProps.room || '');

            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${created}`,
                `DTSTART:${formatDate(start)}`,
                `DTEND:${formatDate(end)}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${location}`,
                'STATUS:CONFIRMED',
                'TRANSP:OPAQUE',
                'END:VEVENT'
            );
        });

        icsContent.push('END:VCALENDAR');
        
        const icsText = icsContent.join('\r\n');
        this.downloadIcsFile(icsText, 'IUtilitySchedule.ics');
    }

    /**
     * Download ICS file content
     */
    downloadIcsFile(content, filename) {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    /**
     * Clear all events and subjects
     */
    clearSchedule() {
        if (confirm('Are you sure you want to clear all subjects and selected classes?')) {
            // Clear calendar events
            this.calendar.getEvents().forEach(event => event.remove());
            
            // Clear data structures
            this.subjects.clear();
            this.selectedClasses.clear();
            
            // Clear UI
            document.getElementById('subjectList').innerHTML = '';
            document.getElementById('rawInput').value = '';
            
            // Clear localStorage
            localStorage.removeItem('IUtility-schedule');
            
            this.showToast('Schedule cleared', 'info');
        }
    }

    /**
     * Initialize theme on application startup
     */
    initializeTheme() {
        // Load theme preference from localStorage
        const savedTheme = localStorage.getItem('iutility-theme') || 'light';
        this.setTheme(savedTheme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Set the theme and update UI
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update the theme toggle icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'light' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
        }
        
        // Save theme preference
        localStorage.setItem('iutility-theme', theme);
        
        // Refresh calendar to apply theme changes
        if (this.calendar) {
            this.calendar.render();
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, danger, warning, info)
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        // Limit to 4 notifications - remove oldest if exceeding limit
        const existingToasts = toastContainer.querySelectorAll('.toast');
        if (existingToasts.length >= 4) {
            // Remove the oldest toast
            const oldestToast = existingToasts[0];
            if (oldestToast) {
                oldestToast.remove();
            }
        }
        
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto text-${type}">IUtility</strong>
                    <small class="text-muted">now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                const toast = new bootstrap.Toast(toastElement);
                toast.hide();
                setTimeout(() => toastElement.remove(), 500);
            }
        }, 5000);
    }

    // Date utility functions to replace dateFns dependency
    startOfWeek(date, options = {}) {
        const weekStartsOn = options.weekStartsOn || 0; // 0 = Sunday, 1 = Monday
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    addWeeks(date, weeks) {
        const d = new Date(date);
        d.setDate(d.getDate() + weeks * 7);
        return d;
    }

    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    setHours(date, hours) {
        const d = new Date(date);
        d.setHours(hours);
        return d;
    }

    setMinutes(date, minutes) {
        const d = new Date(date);
        d.setMinutes(minutes);
        return d;
    }

    addMinutes(date, minutes) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() + minutes);
        return d;
    }

    formatDate(date, format) {
        const d = new Date(date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (format === 'MMM dd') {
            return `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}`;
        }
        return d.toLocaleDateString();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.IUtility = new IUtility();
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (window.IUtility) {
        window.IUtility.showToast('An unexpected error occurred', 'danger');
    }
});

// Global unhandled promise rejection handler
// window.addEventListener('unhandledrejection', (e) => {
//     console.error('Unhandled promise rejection:', e.reason);
//     if (window.IUtility) {
//         window.IUtility.showToast('An unexpected error occurred', 'danger');
//     }
// });
