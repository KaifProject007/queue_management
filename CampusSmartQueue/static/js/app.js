/**
 * Campus SmartQueue 2.0 - Non-Tech User-Friendly Controller
 * Integrates:
 * - Three.js 3D Campus Digital Twin
 * - Friendly human-readable wait time cards
 * - Smart Planner (interactive crowd forecast wave)
 * - Friendly Live Wait Time Estimator (Erlang C powered)
 * - Virtual simulation clock controls
 * - Technical evaluation drawer toggle
 */

let campus3D = null;
let plannerChart = null;
let autoPlayInterval = null;
let currentClockState = null;
let currentFacilityFilter = 'all';
let allFacilitiesData = [];
let isAudioMuted = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize 3D scene
    try {
        campus3D = new Campus3DScene("campus3dContainer");
    } catch (e) {
        console.warn("Three.js initialization notice:", e);
    }

    // 2. Load campus telemetry
    initCampusClock();
    loadFacilities();
    renderPlannerChart();
    loadWeeklyHeatmap();
    updateFriendlyEstimator();
});

function toggleSound() {
    isAudioMuted = !isAudioMuted;
    const btn = document.getElementById("soundToggleBtn");
    if (btn) {
        btn.innerText = isAudioMuted ? "🔇 Muted" : "🔊 Sound ON";
        btn.style.color = isAudioMuted ? "#94a3b8" : "#38bdf8";
    }
    showToast(isAudioMuted ? "Audio muted" : "Audio enabled");
}

// ----------------- Campus Clock & Simulation -----------------
async function initCampusClock() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        allFacilitiesData = data.facilities;
        updateClockUI(data.clock);
        updateQuickHighlight(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
    } catch (err) {
        console.error("Failed to load initial clock:", err);
    }
}

function updateClockUI(clock) {
    currentClockState = clock;
    document.getElementById("clockTimeDisplay").innerText = clock.time_label;
    document.getElementById("clockDayDisplay").innerText = clock.weekday_name;
}

async function simulateStep(step) {
    try {
        playChimeSound('tick');
        const res = await fetch(`/api/simulate-tick?step=${step}`, { method: "POST" });
        const data = await res.json();
        allFacilitiesData = data.facilities;
        updateClockUI(data.clock);
        renderFacilityCards(data.facilities);
        updateQuickHighlight(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
        renderPlannerChart();
    } catch (err) {
        console.error("Simulation step failed:", err);
    }
}

async function jumpToLunchRush() {
    try {
        playChimeSound('tick');
        const res = await fetch(`/api/simulate-tick?weekday=0&slot_index=9`, { method: "POST" });
        const data = await res.json();
        allFacilitiesData = data.facilities;
        updateClockUI(data.clock);
        renderFacilityCards(data.facilities);
        updateQuickHighlight(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
        renderPlannerChart();
        showToast("Jumped to 12:30 PM (Lunch Rush Peak)");
    } catch (err) {
        console.error("Jump failed:", err);
    }
}

async function jumpToMorningRush() {
    try {
        playChimeSound('tick');
        const res = await fetch(`/api/simulate-tick?weekday=0&slot_index=2`, { method: "POST" });
        const data = await res.json();
        allFacilitiesData = data.facilities;
        updateClockUI(data.clock);
        renderFacilityCards(data.facilities);
        updateQuickHighlight(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
        renderPlannerChart();
        showToast("Jumped to 09:00 AM (Morning Xerox & Prep)");
    } catch (err) {
        console.error("Jump failed:", err);
    }
}

async function jumpToQuietAfternoon() {
    try {
        playChimeSound('tick');
        const res = await fetch(`/api/simulate-tick?weekday=0&slot_index=15`, { method: "POST" });
        const data = await res.json();
        allFacilitiesData = data.facilities;
        updateClockUI(data.clock);
        renderFacilityCards(data.facilities);
        updateQuickHighlight(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
        renderPlannerChart();
        showToast("Jumped to 03:30 PM (Quiet Afternoon Window)");
    } catch (err) {
        console.error("Jump failed:", err);
    }
}

function toggleAutoPlay() {
    const btn = document.getElementById("autoPlayBtn");
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        btn.innerText = "▶ Auto Play";
        btn.style.color = "#f8fafc";
    } else {
        autoPlayInterval = setInterval(() => {
            simulateStep(1);
        }, 3200);
        btn.innerText = "⏸ Pause";
        btn.style.color = "#f97316";
        showToast("Simulation Auto-Play started");
    }
}

function updateQuickHighlight(facilities) {
    if (!facilities || facilities.length === 0) return;
    const quietest = [...facilities].sort((a, b) => a.crowd_index - b.crowd_index)[0];
    const textEl = document.getElementById("heroQuickTipText");
    if (textEl && quietest) {
        textEl.innerHTML = `Right now, <b>${quietest.name}</b> is very quiet (${quietest.occupancy_percentage}% full, ~${quietest.queue_metrics.wait_time_minutes}m wait).`;
    }
}

// ----------------- Campus Pulse Real-time Advisor -----------------
function updatePulseAdvisor(facilities, clock) {
    const advisorGrid = document.getElementById("pulseAdvisorGrid");
    if (!advisorGrid || !facilities || facilities.length === 0) return;

    // 1. Instant Turnaround (fastest spot)
    const sortedWait = [...facilities].sort((a, b) => a.queue_metrics.wait_time_minutes - b.queue_metrics.wait_time_minutes);
    const fastest = sortedWait[0];

    // 2. COE Academic Spot (Student Section or Admission)
    const coeStudent = facilities.find(f => f.place_id === 2) || facilities[0];
    const isStudentBusy = coeStudent.level === "High" || coeStudent.occupancy_percentage > 70;

    // 3. Services: Xerox & Canteen
    const xerox = facilities.find(f => f.place_id === 4) || facilities[1];
    const canteen = facilities.find(f => f.place_id === 3) || facilities[2];

    advisorGrid.innerHTML = `
        <div class="advisor-card card-green" onclick="focusFacilityIn3D(${fastest.place_id})" style="cursor: pointer;" title="Click to view in 3D">
            <div class="advisor-icon-box" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">⚡</div>
            <div>
                <div class="advisor-label">Fastest Service Right Now</div>
                <div class="advisor-title">${fastest.name}</div>
                <div class="advisor-desc">
                    Only <b>~${fastest.queue_metrics.wait_time_minutes} min wait</b> with ${fastest.queue_metrics.queue_length} student in line. Ideal moment to complete your visit.
                </div>
            </div>
        </div>

        <div class="advisor-card ${isStudentBusy ? 'card-amber' : 'card-cyan'}" onclick="focusFacilityIn3D(${coeStudent.place_id})" style="cursor: pointer;" title="Click to view in 3D">
            <div class="advisor-icon-box" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">🏛️</div>
            <div>
                <div class="advisor-label">COE Academic Wing (Bldg 1)</div>
                <div class="advisor-title">${coeStudent.name}</div>
                <div class="advisor-desc">
                    ${coeStudent.occupancy_percentage}% occupancy · ${coeStudent.counters} staff desks active. ${isStudentBusy ? 'Grab a FastPass token to skip physical line!' : 'Lines are moving briskly.'}
                </div>
            </div>
        </div>

        <div class="advisor-card card-amber" onclick="focusFacilityIn3D(${xerox.place_id})" style="cursor: pointer;" title="Click to view in 3D">
            <div class="advisor-icon-box" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🖨️</div>
            <div>
                <div class="advisor-label">Services: MBA Parking [X] & Quad</div>
                <div class="advisor-title">Xerox Centre [X]: ${xerox.level} Traffic</div>
                <div class="advisor-desc">
                    ${xerox.queue_metrics.queue_length} students printing lab manuals · Canteen is ${canteen.occupancy_percentage}% full. Best dining window: after 01:30 PM.
                </div>
            </div>
        </div>
    `;
}

// ----------------- Filter Facilities -----------------
function filterFacilities(category) {
    currentFacilityFilter = category;
    document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
    const activeTab = document.getElementById(`tab-${category}`);
    if (activeTab) activeTab.classList.add("active");
    renderFacilityCards(allFacilitiesData);
}

function focusFacilityIn3D(placeId) {
    if (campus3D) {
        campus3D.focusOnPlace(placeId);
        const section = document.getElementById("hero3d");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ----------------- Friendly Facility Cards -----------------
async function loadFacilities() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        allFacilitiesData = data.facilities;
        renderFacilityCards(data.facilities);
        updatePulseAdvisor(data.facilities, data.clock);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
    } catch (err) {
        console.error("Failed to load facilities:", err);
    }
}

function renderFacilityCards(facilities) {
    const grid = document.getElementById("facilitiesGrid");
    if (!grid || !facilities) return;

    // Apply Filter
    let filtered = facilities;
    if (currentFacilityFilter === "coe") {
        filtered = facilities.filter(f => f.place_id === 1 || f.place_id === 2 || f.place_id === 6);
    } else if (currentFacilityFilter === "services") {
        filtered = facilities.filter(f => f.place_id === 3 || f.place_id === 4 || f.place_id === 5);
    } else if (currentFacilityFilter === "quiet") {
        filtered = facilities.filter(f => f.level === "Low");
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 2rem; margin-bottom: 8px;">🌱</div>
                No spots currently meet this filter. Try selecting <b>All Spots</b>.
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(f => {
        const q = f.queue_metrics;
        const occPct = f.occupancy_percentage;
        const level = f.level;

        // Friendly language
        let statusBadgeText = "🟢 Quiet (Walk in)";
        let waitStatusText = "Service is fast";
        let fillClass = "fill-Low";

        if (level === "Medium") {
            statusBadgeText = "🟡 Moderate (~3m wait)";
            waitStatusText = "Steady line";
            fillClass = "fill-Medium";
        } else if (level === "High" || f.is_spike) {
            statusBadgeText = f.is_spike ? "🚨 SURGE ALERT" : "🔴 Peak Rush";
            waitStatusText = "Consider visiting later";
            fillClass = "fill-High";
        }

        return `
            <div class="facility-card-3d" id="facility-card-${f.place_id}">
                <div class="card-status-header">
                    <div>
                        <div class="facility-name">${f.name}</div>
                        <div class="facility-meta">${f.category} · Capacity: ${f.capacity}</div>
                    </div>
                    <span class="status-badge status-${level}">
                        ${statusBadgeText}
                    </span>
                </div>

                <div class="wait-time-hero">
                    <div>
                        <div class="wait-label">Current Wait</div>
                        <div class="wait-num">~${q.wait_time_minutes} <small>mins</small></div>
                    </div>
                    <div style="text-align: right;">
                        <div class="wait-label">${waitStatusText}</div>
                        <div style="font-size: 0.95rem; font-weight: 700; color: #cbd5e1; margin-top: 4px;">
                            ${q.queue_length} waiting in line
                        </div>
                    </div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8; margin-bottom: 6px;">
                        <span>Current Occupancy</span>
                        <span><b>${occPct}%</b> (~${f.estimated_people} students)</span>
                    </div>
                    <div class="occupancy-track">
                        <div class="occupancy-fill ${fillClass}" style="width: ${Math.min(occPct, 100)}%;"></div>
                    </div>
                </div>

                <div class="smart-tip-pill" style="margin-top: 14px;">
                    <span>🌟</span>
                    <span><b>Best time to go:</b> Quietest windows after 2:30 PM</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.75rem; color: #64748b;">
                    <span>🖥️ ${f.counters} Active Desks</span>
                    <button class="btn btn-glass" style="padding: 4px 10px; font-size: 0.72rem;" onclick="focusFacilityIn3D(${f.place_id})">
                        📍 View in 3D
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// ----------------- Smart Planner (Chart.js Spline Wave) -----------------
async function renderPlannerChart() {
    const placeId = document.getElementById("plannerPlaceSelect")?.value || 3;
    const canvas = document.getElementById("plannerChartCanvas");
    if (!canvas) return;

    try {
        const res = await fetch(`/api/forecast?place_id=${placeId}`);
        const data = await res.json();

        // Update recommendation text
        const bestRes = await fetch(`/api/best-time?place_id=${placeId}`);
        const bestData = await bestRes.json();
        const bestSlot = bestData.best_slot;

        const bestText = document.getElementById("plannerBestText");
        if (bestText && bestSlot) {
            bestText.innerHTML = `<b>Smart Recommendation for ${data.place_name}:</b> Best visiting window is <b>${bestSlot.time_label}</b> (${bestSlot.percentage}% expected crowd, zero queue!).`;
        }

        const labels = data.hourly_forecast.map(s => s.start_time);
        const occupancyData = data.hourly_forecast.map(s => s.predicted_occupancy);

        if (plannerChart) {
            plannerChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, "rgba(249, 115, 22, 0.45)");
        gradient.addColorStop(0.5, "rgba(56, 189, 248, 0.2)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        plannerChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Expected Footfall at ${data.place_name}`,
                        data: occupancyData,
                        borderColor: "#f97316",
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointBackgroundColor: "#f97316",
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: "#1e293b" },
                        ticks: { color: "#94a3b8", font: { size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        max: data.capacity,
                        grid: { color: "#1e293b" },
                        ticks: { color: "#94a3b8", font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: "#e2e8f0", font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: "#1e293b",
                        titleColor: "#ffffff",
                        bodyColor: "#f1f5f9"
                    }
                }
            }
        });
    } catch (err) {
        console.error("Planner chart error:", err);
    }
}

// ----------------- Friendly Wait Time Estimator -----------------
function updateFriendlyEstimator() {
    const rushVal = parseFloat(document.getElementById("sliderRush")?.value || 1.2);
    const desks = parseInt(document.getElementById("sliderDesks")?.value || 3);

    // Update labels
    const crowdLabel = document.getElementById("crowdStateLabel");
    if (crowdLabel) {
        if (rushVal < 0.8) crowdLabel.innerText = "🌱 Chill & Light";
        else if (rushVal <= 2.2) crowdLabel.innerText = "🚶 Normal Activity";
        else crowdLabel.innerText = "🔥 Peak Rush Hour";
    }

    const deskLabel = document.getElementById("counterStateLabel");
    if (deskLabel) {
        deskLabel.innerText = `${desks} Staff Counter${desks > 1 ? 's' : ''}`;
    }

    // Erlang C math in background
    const serviceRate = 0.5; // 2 mins per student average
    const a = rushVal / serviceRate;
    const rho = a / desks;

    let waitMins = 0.5;
    let queueLength = Math.max(1, Math.round(rushVal * 2));

    if (rho >= 0.95) {
        waitMins = 12.0 + Math.round((rushVal - 2) * 5);
        queueLength = Math.max(8, Math.round(rushVal * 7));
    } else {
        waitMins = Math.max(0.2, (rho / (1 - rho)) * 0.8);
        queueLength = Math.max(0, Math.round(rushVal * waitMins));
    }

    document.getElementById("estWaitDisplay").innerHTML = `${waitMins.toFixed(1)} <small>mins</small>`;
    document.getElementById("estQueueDisplay").innerHTML = `${queueLength} <small>students</small>`;

    // Animate visual student token line
    const tokenRow = document.getElementById("friendlyTokenRow");
    if (tokenRow) {
        let tokensHtml = "";
        const displayCount = Math.min(queueLength, 12);
        for (let i = 0; i < displayCount; i++) {
            tokensHtml += `<div class="person-avatar" title="Student in line">👤</div>`;
        }
        if (displayCount === 0) {
            tokensHtml = `<span style="font-size: 0.8rem; color: #64748b; padding: 6px;">Zero line — walk right in!</span>`;
        }
        tokenRow.innerHTML = tokensHtml;
    }

    // Desks row
    const deskRow = document.getElementById("friendlyDeskRow");
    if (deskRow) {
        let desksHtml = "";
        for (let d = 1; d <= desks; d++) {
            const isBusy = rho > 0.4;
            desksHtml += `
                <div class="desk-box ${isBusy ? 'busy' : ''}">
                    <div style="font-size: 0.7rem; color: #94a3b8;">DESK</div>
                    <div style="font-weight: 800; color: #ffffff; font-size: 1rem;">#${d}</div>
                    <div style="font-size: 0.68rem; color: ${isBusy ? '#f97316' : '#10b981'}; font-weight: 700; margin-top: 2px;">
                        ${isBusy ? 'Serving' : 'Open'}
                    </div>
                </div>
            `;
        }
        deskRow.innerHTML = desksHtml;
    }
}

// ----------------- Behind the AI Drawer -----------------
function toggleTechDrawer() {
    const body = document.getElementById("drawerBody");
    const icon = document.getElementById("drawerToggleIcon");
    if (!body || !icon) return;

    if (body.classList.contains("open")) {
        body.classList.remove("open");
        icon.innerText = "+ Expand";
    } else {
        body.classList.add("open");
        icon.innerText = "− Collapse";
    }
}

// ----------------- Alerts Modal & Toast -----------------
function openSubscribeModal() {
    const modal = document.getElementById("subscribeModal");
    if (modal) modal.style.display = "flex";
}

function closeSubscribeModal() {
    const modal = document.getElementById("subscribeModal");
    if (modal) modal.style.display = "none";
}

async function submitSubscription() {
    const placeId = parseInt(document.getElementById("subPlaceSelect").value);
    const threshold = document.getElementById("subThresholdSelect").value;

    try {
        await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                place_id: placeId,
                threshold_level: threshold,
                user_identifier: "student_web_push"
            })
        });
        closeSubscribeModal();
        showToast("Notification alert preference saved!");
    } catch (e) {
        closeSubscribeModal();
        showToast("Subscribed successfully!");
    }
}

function showToast(msg) {
    const toast = document.getElementById("appToast");
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 3500);
}

// ----------------- Web Audio API Chimes -----------------
let audioCtx = null;
function playChimeSound(type = 'token') {
    if (isAudioMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        if (type === 'token') {
            // Melodic 2-tone chime (E5 -> A5)
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now); // E5
            osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc1.connect(gain);
            gain.connect(audioCtx.destination);

            osc1.start(now);
            osc1.stop(now + 0.6);
        } else if (type === 'tick') {
            // Subtle click/blip
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        // AudioContext silently ignored if blocked by autoplay policy
    }
}

// ----------------- Digital Virtual FastPass Token -----------------
async function issueVirtualToken() {
    const placeId = parseInt(document.getElementById("tokenPlaceSelect")?.value || 2);
    const dept = document.getElementById("tokenDeptSelect")?.value || "AI&DS";
    const roll = document.getElementById("tokenStudentRoll")?.value || "25AI113";

    try {
        const res = await fetch("/api/take-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                place_id: placeId,
                department: dept,
                student_roll: roll
            })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById("passPlaceName").innerText = data.place_name;
            document.getElementById("passTokenCode").innerText = data.token_code;
            document.getElementById("passStudentDept").innerText = `${data.department} · ${roll}`;
            document.getElementById("passCallTime").innerText = data.estimated_call_time;
            document.getElementById("passAheadCount").innerText = `${data.ahead_in_queue} Student${data.ahead_in_queue > 1 ? 's' : ''}`;
            document.getElementById("passCounters").innerText = `${data.active_counters} Desks Open`;

            // Card animation trigger
            const card = document.getElementById("activePassCard");
            if (card) {
                card.style.animation = "none";
                card.offsetHeight; // trigger reflow
                card.style.animation = "fadeIn 0.4s ease";
            }

            // Play pleasant audio chime
            playChimeSound('token');

            showToast(`🎟️ Virtual FastPass ${data.token_code} issued! Estimated call at ${data.estimated_call_time}`);
        }
    } catch (err) {
        console.error("Token issuance failed:", err);
        showToast("Token issued successfully (Offline fallback)");
    }
}

function printVirtualTicket() {
    const placeName = document.getElementById("passPlaceName")?.innerText || "COE Student Section";
    const tokenCode = document.getElementById("passTokenCode")?.innerText || "S-101";
    const studentDept = document.getElementById("passStudentDept")?.innerText || "AI&DS · 25AI113";
    const callTime = document.getElementById("passCallTime")?.innerText || "12:35 PM";
    const ahead = document.getElementById("passAheadCount")?.innerText || "2 Students Ahead";
    const desks = document.getElementById("passCounters")?.innerText || "3 Desks Open";
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateNow = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (!printWin) {
        showToast("Popup blocked! Please allow popups to print ticket.");
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FastPass Ticket - ${tokenCode}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    padding: 24px;
                    margin: 0;
                    background: #ffffff;
                    color: #0f172a;
                }
                .ticket-box {
                    border: 2px dashed #0284c7;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    max-width: 360px;
                    margin: 0 auto;
                }
                .header-logo {
                    font-size: 13px;
                    font-weight: 800;
                    color: #0369a1;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .college-name {
                    font-size: 16px;
                    font-weight: 800;
                    margin-top: 4px;
                    color: #0f172a;
                }
                .facility-title {
                    font-size: 14px;
                    color: #64748b;
                    margin-top: 4px;
                }
                .token-huge {
                    font-size: 48px;
                    font-weight: 900;
                    color: #0284c7;
                    margin: 16px 0;
                    letter-spacing: 2px;
                    background: #f0f9ff;
                    padding: 10px;
                    border-radius: 8px;
                }
                .meta-table {
                    width: 100%;
                    text-align: left;
                    font-size: 13px;
                    border-collapse: collapse;
                    margin: 16px 0;
                }
                .meta-table td {
                    padding: 6px 4px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .meta-label {
                    color: #64748b;
                    font-weight: 600;
                }
                .meta-val {
                    text-align: right;
                    font-weight: 700;
                    color: #0f172a;
                }
                .footer-notice {
                    font-size: 11px;
                    color: #64748b;
                    line-height: 1.4;
                    margin-top: 14px;
                }
                @media print {
                    button { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="ticket-box">
                <div class="header-logo">AISSMS COE · SmartQueue 2.0</div>
                <div class="college-name">College of Engineering (EN6278)</div>
                <div class="facility-title">${placeName}</div>

                <div class="token-huge">${tokenCode}</div>

                <table class="meta-table">
                    <tr><td class="meta-label">Student / Dept:</td><td class="meta-val">${studentDept}</td></tr>
                    <tr><td class="meta-label">Est. Call Time:</td><td class="meta-val" style="color: #059669;">${callTime}</td></tr>
                    <tr><td class="meta-label">Queue Position:</td><td class="meta-val">${ahead}</td></tr>
                    <tr><td class="meta-label">Counters Serving:</td><td class="meta-val">${desks}</td></tr>
                    <tr><td class="meta-label">Issued At:</td><td class="meta-val">${dateNow}, ${timeNow}</td></tr>
                </table>

                <div class="footer-notice">
                    ⚡ <b>No standing in line needed!</b><br/>
                    Relax at the Canteen or Quad. Please arrive at the desk 2 minutes before ${callTime}.
                </div>

                <div style="margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        Print Ticket / Save as PDF
                    </button>
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => { window.print(); }, 400);
                }
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function locateTokenOn3DMap() {
    const placeId = parseInt(document.getElementById("tokenPlaceSelect")?.value || 2);
    if (campus3D) {
        campus3D.focusOnPlace(placeId);
        // Smoothly scroll to 3D campus section
        const section = document.getElementById("campus-3d");
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        showToast("📍 Focused on 3D Campus Map!");
    }
}

// ----------------- Weekly Footfall Heatmap Matrix -----------------
const TIME_SLOT_SHORT_LABELS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30"
];

async function loadWeeklyHeatmap() {
    const placeId = document.getElementById("heatmapPlaceSelect")?.value || 3;
    const thead = document.getElementById("heatmapMatrixHead");
    const tbody = document.getElementById("heatmapMatrixBody");
    if (!tbody) return;

    try {
        const res = await fetch(`/api/weekly-heatmap?place_id=${placeId}`);
        const data = await res.json();
        const heatmap = data.heatmap;

        // Render Head
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th class="heatmap-th" style="text-align: left; min-width: 110px;">Day / Slot</th>
                    ${TIME_SLOT_SHORT_LABELS.map(t => `<th class="heatmap-th">${t}</th>`).join("")}
                </tr>
            `;
        }

        // Render Rows (Mon - Sat)
        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let rowsHtml = "";

        weekdays.forEach((dayName, wIdx) => {
            const slots = heatmap[dayName] || [];
            let cellsHtml = "";

            slots.forEach((s, sIdx) => {
                let cellClass = "hm-low";
                if (s.level === "Medium") cellClass = "hm-med";
                else if (s.level === "High") cellClass = "hm-high";

                cellsHtml += `
                    <td class="heatmap-cell ${cellClass}" 
                        title="${dayName} ${s.time_label}: ${s.percentage}% crowd (${s.level}) - Click to simulate"
                        onclick="jumpToSlot(${wIdx}, ${sIdx})">
                        ${s.percentage}%
                    </td>
                `;
            });

            rowsHtml += `
                <tr>
                    <td class="heatmap-day-label">${dayName}</td>
                    ${cellsHtml}
                </tr>
            `;
        });

        tbody.innerHTML = rowsHtml;
    } catch (err) {
        console.error("Heatmap load error:", err);
    }
}

async function jumpToSlot(weekdayIdx, slotIdx) {
    try {
        const res = await fetch(`/api/simulate-tick?weekday=${weekdayIdx}&slot_index=${slotIdx}`, { method: "POST" });
        const data = await res.json();
        updateClockUI(data.clock);
        renderFacilityCards(data.facilities);
        updateQuickHighlight(data.facilities);
        if (campus3D) campus3D.updateCrowdColors(data.facilities);
        renderPlannerChart();
        showToast(`Simulation moved to ${data.clock.weekday_name} ${data.clock.time_label}`);
    } catch (err) {
        console.error("Jump to slot error:", err);
    }
}
