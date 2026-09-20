/* =========================================================
   SANDIPANI DIGITAL CAMPUS
   ADVANCED ADMIN PANEL
   ========================================================= */

let adminPin = "";
let studentsCache = [];
let currentSettings = [];
let isLoggedIn = false;


/* =========================================================
   HELPERS
   ========================================================= */

function adminMsg(t, type = "") {
    if (typeof msg === "function") {
        msg("adminMsg", t, type);
        return;
    }

    const box = document.getElementById("adminMsg");

    if (!box) return;

    box.textContent = t;
    box.className = "message " + type;
}


function v(id) {
    return document.getElementById(id)?.value || "";
}


function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escAttr(value) {
    return esc(value);
}


/* =========================================================
   ADMIN PANEL LOCK
   ========================================================= */

function lockAdminPanel() {

    isLoggedIn = false;
    adminPin = "";

    const loginCard = document.getElementById("loginCard");
    const adminPanel = document.getElementById("adminPanel");

    if (loginCard) {
        loginCard.classList.remove("hidden");
        loginCard.style.display = "";
    }

    if (adminPanel) {
        adminPanel.classList.add("hidden");
        adminPanel.style.display = "none";
    }
}


function unlockAdminPanel() {

    isLoggedIn = true;

    const loginCard = document.getElementById("loginCard");
    const adminPanel = document.getElementById("adminPanel");

    if (loginCard) {
        loginCard.classList.add("hidden");
        loginCard.style.display = "none";
    }

    if (adminPanel) {
        adminPanel.classList.remove("hidden");
        adminPanel.style.display = "";
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function adminLogin() {

    const input = document.getElementById("adminPin");

    const p = input?.value.trim() || "";

    if (!p) {
        adminMsg("PIN required.", "error");
        return;
    }

    const loginButton =
        document.querySelector(
            '#loginCard button[type="submit"], #loginCard button'
        );

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Checking...";
    }

    try {

        const r =
            await apiCall(
                "verifyAdmin",
                {
                    pin: p
                }
            );

        if (!r || r.valid !== true) {

            adminMsg(
                "❌ Invalid Admin PIN.",
                "error"
            );

            if (input) {
                input.value = "";
                input.focus();
            }

            return;
        }

        adminPin = p;

        unlockAdminPanel();

        adminMsg(
            "✅ Admin login successful.",
            "ok"
        );

        await loadStats();
        await loadStudents();
        await loadSettings();

        addAdvancedStudentTools();

    }
    catch (e) {

        adminMsg(
            e.message ||
            "Admin login failed.",
            "error"
        );

    }
    finally {

        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }

    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function adminLogout() {

    if (
        !confirm(
            "Are you sure you want to logout from Admin Panel?"
        )
    ) {
        return;
    }

    adminPin = "";
    isLoggedIn = false;
    studentsCache = [];
    currentSettings = [];

    const input =
        document.getElementById("adminPin");

    if (input) {
        input.value = "";
    }

    lockAdminPanel();

    adminMsg(
        "You have been logged out.",
        "ok"
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {

    if (!isLoggedIn) return;

    const r =
        await apiCall(
            "stats",
            {
                pin: adminPin
            }
        );

    const result = r.result || r;

    const students =
        document.getElementById("statStudents");

    const marks =
        document.getElementById("statMarks");

    if (students) {
        students.textContent =
            result.students ?? 0;
    }

    if (marks) {
        marks.textContent =
            result.marks ?? 0;
    }
}


/* =========================================================
   LOAD STUDENTS
   ========================================================= */

async function loadStudents() {

    if (!isLoggedIn) return;

    try {

        const filters = {
            search:
                document.getElementById(
                    "studentSearch"
                )?.value || ""
        };

        const r =
            await apiCall(
                "students",
                {
                    pin: adminPin,
                    filters: filters
                }
            );

        studentsCache =
            r.result ||
            r.students ||
            [];

        renderStudentTable();

        updateAdvancedFilters();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   RENDER STUDENT TABLE
   ========================================================= */

function renderStudentTable(list = null) {

    const tbody =
        document.getElementById(
            "studentRows"
        );

    if (!tbody) return;

    const students =
        list || getFilteredStudents();

    tbody.innerHTML =
        students.map(s => {

            return `
            <tr>

                <td class="select-column">
                    <input
                        type="checkbox"
                        class="student-check"
                        value="${escAttr(s._row)}"
                    >
                </td>

                <td>${esc(s.Name)}</td>

                <td>${esc(s.Class)}</td>

                <td>${esc(s.Section)}</td>

                <td>${esc(s.Roll)}</td>

                <td>${esc(s.Medium)}</td>

                <td>${esc(s.Trade)}</td>

                <td>
                    <div class="admin-actions">

                        <button
                            class="mini blue"
                            onclick="editStudent(${s._row})"
                        >
                            Edit
                        </button>

                        <button
                            class="mini red"
                            onclick="deleteStudent(${s._row})"
                        >
                            Delete
                        </button>

                    </div>
                </td>

            </tr>
            `;

        }).join("")

        ||

        `
        <tr>
            <td colspan="8">
                No students found.
            </td>
        </tr>
        `;

    addSelectAllHandler();
}


/* =========================================================
   GET FILTERED STUDENTS
   ========================================================= */

function getFilteredStudents() {

    let list = [...studentsCache];


    const search =
        (
            document.getElementById(
                "studentSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const classFilter =
        document.getElementById(
            "studentClassFilter"
        )?.value || "";


    const sectionFilter =
        document.getElementById(
            "studentSectionFilter"
        )?.value || "";


    const mediumFilter =
        document.getElementById(
            "studentMediumFilter"
        )?.value || "";


    const tradeFilter =
        document.getElementById(
            "studentTradeFilter"
        )?.value || "";


    const jobFilter =
        document.getElementById(
            "studentJobFilter"
        )?.value || "";


    if (search) {

        list =
            list.filter(s => {

                const text = [

                    s.Name,
                    s.Parent,
                    s.Roll,
                    s.Class,
                    s.Section,
                    s.Mobile,
                    s.Trade,
                    s["Job Role"]

                ]
                .join(" ")
                .toLowerCase();

                return text.includes(search);

            });

    }


    if (classFilter) {

        list =
            list.filter(
                s =>
                    String(s.Class || "") ===
                    classFilter
            );

    }


    if (sectionFilter) {

        list =
            list.filter(
                s =>
                    String(s.Section || "") ===
                    sectionFilter
            );

    }


    if (mediumFilter) {

        list =
            list.filter(
                s =>
                    String(s.Medium || "") ===
                    mediumFilter
            );

    }


    if (tradeFilter) {

        list =
            list.filter(
                s =>
                    String(s.Trade || "") ===
                    tradeFilter
            );

    }


    if (jobFilter) {

        list =
            list.filter(
                s =>
                    String(s["Job Role"] || "") ===
                    jobFilter
            );

    }


    return list;
}


/* =========================================================
   ADVANCED FILTER TOOLBAR
   ========================================================= */

function addAdvancedStudentTools() {

    if (
        document.getElementById(
            "advancedStudentTools"
        )
    ) {
        return;
    }


    const tbody =
        document.getElementById(
            "studentRows"
        );

    if (!tbody) return;


    const table =
        tbody.closest("table");

    if (!table) return;


    const wrapper =
        document.createElement("div");

    wrapper.id =
        "advancedStudentTools";


    wrapper.style.cssText = `
        background:#f8fbff;
        border:1px solid #dbe5f0;
        border-radius:12px;
        padding:14px;
        margin:15px 0;
    `;


    wrapper.innerHTML = `

        <div style="
            font-weight:800;
            color:#104f9d;
            margin-bottom:10px;
            font-size:16px;
        ">
            🔎 Student Filter & Print
        </div>


        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(150px,1fr));
            gap:9px;
        ">

            <input
                id="studentSearchAdvanced"
                placeholder="Search Name / Roll"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >


            <select
                id="studentClassFilter"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >
                <option value="">All Classes</option>
                <option value="9th">9th</option>
                <option value="10th">10th</option>
                <option value="11th">11th</option>
                <option value="12th">12th</option>
            </select>


            <select
                id="studentSectionFilter"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >
                <option value="">All Sections</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
            </select>


            <select
                id="studentMediumFilter"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >
                <option value="">All Medium</option>
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
            </select>


            <select
                id="studentTradeFilter"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >
                <option value="">All Trades</option>
            </select>


            <select
                id="studentJobFilter"
                style="
                    padding:10px;
                    border:1px solid #b8c1cf;
                    border-radius:8px;
                "
            >
                <option value="">All Job Roles</option>
            </select>

        </div>


        <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:12px;
        ">

            <button
                type="button"
                id="selectAllStudentsBtn"
                class="mini blue"
            >
                ☑️ Select All
            </button>


            <button
                type="button"
                id="clearSelectionBtn"
                class="mini"
            >
                ☐ Clear Selection
            </button>


            <button
                type="button"
                id="printFilteredBtn"
                class="mini blue"
            >
                🖨️ Print Filtered
            </button>


            <button
                type="button"
                id="printSelectedBtn"
                class="mini green"
            >
                🖨️ Print Selected
            </button>


            <button
                type="button"
                id="printColumnsBtn"
                class="mini"
            >
                📋 Select Print Columns
            </button>


            <button
                type="button"
                id="clearStudentFiltersBtn"
                class="mini red"
            >
                ✕ Clear Filters
            </button>

        </div>


        <div
            id="filterCount"
            style="
                margin-top:10px;
                font-size:13px;
                font-weight:700;
                color:#475467;
            "
        ></div>

    `;


    table.parentNode.insertBefore(
        wrapper,
        table
    );


    /* Event listeners */

    const inputs =
        wrapper.querySelectorAll(
            "input,select"
        );


    inputs.forEach(input => {

        input.addEventListener(
            "input",
            applyAdvancedFilters
        );

        input.addEventListener(
            "change",
            applyAdvancedFilters
        );

    });


    document
        .getElementById(
            "selectAllStudentsBtn"
        )
        .addEventListener(
            "click",
            selectAllStudents
        );


    document
        .getElementById(
            "clearSelectionBtn"
        )
        .addEventListener(
            "click",
            clearStudentSelection
        );


    document
        .getElementById(
            "printFilteredBtn"
        )
        .addEventListener(
            "click",
            () =>
                printStudents(
                    getFilteredStudents()
                )
        );


    document
        .getElementById(
            "printSelectedBtn"
        )
        .addEventListener(
            "click",
            printSelectedStudents
        );


    document
        .getElementById(
            "printColumnsBtn"
        )
        .addEventListener(
            "click",
            showPrintColumnSelector
        );


    document
        .getElementById(
            "clearStudentFiltersBtn"
        )
        .addEventListener(
            "click",
            clearStudentFilters
        );


    updateAdvancedFilters();

    updateFilterCount();
}


/* =========================================================
   UPDATE FILTER OPTIONS
   ========================================================= */

function updateAdvancedFilters() {

    const trade =
        document.getElementById(
            "studentTradeFilter"
        );

    const job =
        document.getElementById(
            "studentJobFilter"
        );


    if (!trade || !job) return;


    const currentTrade =
        trade.value;


    const currentJob =
        job.value;


    const trades =
        [...new Set(
            studentsCache
                .map(s => s.Trade)
                .filter(Boolean)
        )];


    const jobs =
        [...new Set(
            studentsCache
                .map(s => s["Job Role"])
                .filter(Boolean)
        )];


    trade.innerHTML =
        `<option value="">All Trades</option>` +
        trades.map(x =>
            `<option value="${escAttr(x)}">
                ${esc(x)}
            </option>`
        ).join("");


    job.innerHTML =
        `<option value="">All Job Roles</option>` +
        jobs.map(x =>
            `<option value="${escAttr(x)}">
                ${esc(x)}
            </option>`
        ).join("");


    if (trades.includes(currentTrade)) {
        trade.value = currentTrade;
    }


    if (jobs.includes(currentJob)) {
        job.value = currentJob;
    }
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyAdvancedFilters() {

    const list =
        getFilteredStudents();

    renderStudentTable(list);

    updateFilterCount();
}


/* =========================================================
   FILTER COUNT
   ========================================================= */

function updateFilterCount() {

    const box =
        document.getElementById(
            "filterCount"
        );

    if (!box) return;

    const list =
        getFilteredStudents();

    box.textContent =
        `Showing ${list.length} of ${studentsCache.length} students`;
}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearStudentFilters() {

    [
        "studentSearchAdvanced",
        "studentClassFilter",
        "studentSectionFilter",
        "studentMediumFilter",
        "studentTradeFilter",
        "studentJobFilter"
    ].forEach(id => {

        const x =
            document.getElementById(id);

        if (x) x.value = "";

    });


    const oldSearch =
        document.getElementById(
            "studentSearch"
        );

    if (oldSearch) {
        oldSearch.value = "";
    }


    renderStudentTable(
        studentsCache
    );

    updateFilterCount();
}


/* =========================================================
   SELECT ALL
   ========================================================= */

function selectAllStudents() {

    document
        .querySelectorAll(
            "#studentRows .student-check"
        )
        .forEach(cb => {

            cb.checked = true;

        });

}


/* =========================================================
   CLEAR SELECTION
   ========================================================= */

function clearStudentSelection() {

    document
        .querySelectorAll(
            "#studentRows .student-check"
        )
        .forEach(cb => {

            cb.checked = false;

        });

}


/* =========================================================
   SELECT ALL HANDLER
   ========================================================= */

function addSelectAllHandler() {

    const old =
        document.getElementById(
            "studentRows"
        );

    if (!old) return;

    old
        .querySelectorAll(
            ".student-check"
        )
        .forEach(cb => {

            cb.addEventListener(
                "change",
                updateFilterCount
            );

        });
}


/* =========================================================
   PRINT COLUMN SELECTOR
   ========================================================= */

function showPrintColumnSelector() {

    const fields = [

        ["Name", "Student Name"],
        ["Parent", "Father / Guardian Name"],
        ["Class", "Class"],
        ["Section", "Section"],
        ["Roll", "Roll Number"],
        ["Medium", "Medium"],
        ["Mobile", "Mobile Number"],
        ["Trade", "Trade"],
        ["Job Role", "Job Role"],
        ["Stream", "Stream"],
        ["Skipped Subject", "Skipped Subject"],
        ["Additional Subject", "Additional Subject"],
        ["Status", "Status"]

    ];


    let old =
        document.getElementById(
            "printColumnModal"
        );

    if (old) old.remove();


    const modal =
        document.createElement("div");

    modal.id =
        "printColumnModal";


    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:15px;
    `;


    modal.innerHTML = `

        <div style="
            background:#fff;
            width:100%;
            max-width:480px;
            max-height:90vh;
            overflow:auto;
            border-radius:15px;
            padding:20px;
            box-shadow:0 15px 50px rgba(0,0,0,.25);
        ">

            <h3 style="
                margin-top:0;
                color:#104f9d;
            ">
                📋 Select Information for Print
            </h3>


            <p style="
                font-size:13px;
                color:#667085;
            ">
                जिन जानकारी को print में रखना है
                उन्हें select करें।
            </p>


            <div id="printColumnList">

                ${fields.map(
                    ([key,label],index) => `

                    <label style="
                        display:flex;
                        align-items:center;
                        gap:9px;
                        padding:8px 0;
                        border-bottom:1px solid #eee;
                    ">

                        <input
                            type="checkbox"
                            class="print-field"
                            value="${escAttr(key)}"
                            ${index < 6 ? "checked" : ""}
                        >

                        <span>
                            ${esc(label)}
                        </span>

                    </label>

                `
                ).join("")}

            </div>


            <div style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:18px;
            ">

                <button
                    type="button"
                    id="printNowBtn"
                    class="mini blue"
                >
                    🖨️ Print
                </button>

                <button
                    type="button"
                    id="cancelPrintBtn"
                    class="mini"
                >
                    Cancel
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    document
        .getElementById(
            "cancelPrintBtn"
        )
        .onclick =
            () => modal.remove();


    document
        .getElementById(
            "printNowBtn"
        )
        .onclick =
            () => {

                const selectedFields =
                    [
                        ...document.querySelectorAll(
                            ".print-field:checked"
                        )
                    ]
                    .map(x => x.value);


                if (!selectedFields.length) {

                    alert(
                        "कम से कम एक information select करें।"
                    );

                    return;
                }


                modal.remove();


                const students =
                    getStudentsForPrint();


                if (!students.length) {

                    alert(
                        "Print करने के लिए कोई student नहीं मिला।"
                    );

                    return;
                }


                printStudents(
                    students,
                    selectedFields
                );

            };
}


/* =========================================================
   GET STUDENTS FOR PRINT
   ========================================================= */

function getStudentsForPrint() {

    const checked =
        [
            ...document.querySelectorAll(
                "#studentRows .student-check:checked"
            )
        ]
        .map(x => Number(x.value));


    if (checked.length) {

        return studentsCache.filter(
            s =>
                checked.includes(
                    Number(s._row)
                )
        );

    }


    return getFilteredStudents();
}


/* =========================================================
   PRINT SELECTED
   ========================================================= */

function printSelectedStudents() {

    const selected =
        [
            ...document.querySelectorAll(
                "#studentRows .student-check:checked"
            )
        ];


    if (!selected.length) {

        alert(
            "पहले कम से कम एक student select करें।"
        );

        return;
    }


    showPrintColumnSelector();
}


/* =========================================================
   PRINT STUDENTS
   ========================================================= */

function printStudents(
    students,
    fields = [
        "Name",
        "Parent",
        "Class",
        "Section",
        "Roll",
        "Medium"
    ]
) {

    if (!students.length) {

        alert(
            "Print करने के लिए कोई student नहीं मिला।"
        );

        return;
    }


    const labels = {

        Name:
            "Student Name",

        Parent:
            "Father / Guardian",

        Class:
            "Class",

        Section:
            "Section",

        Roll:
            "Roll Number",

        Medium:
            "Medium",

        Mobile:
            "Mobile",

        Trade:
            "Trade",

        "Job Role":
            "Job Role",

        Stream:
            "Stream",

        "Skipped Subject":
            "Skipped Subject",

        "Additional Subject":
            "Additional Subject",

        Status:
            "Status"

    };


    const rows =
        students.map(s => `

            <tr>

                ${fields.map(
                    field => `

                    <td>
                        ${esc(
                            s[field] ?? ""
                        )}
                    </td>

                `
                ).join("")}

            </tr>

        `).join("");


    const heading =
        fields.length <= 6
        ? "Student List"
        : "Detailed Student List";


    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Sandipani Digital Campus - Student Print
</title>

<style>

body{
    font-family:Arial,Helvetica,sans-serif;
    margin:25px;
    color:#172033;
}

.header{
    text-align:center;
    border-bottom:2px solid #1769d1;
    padding-bottom:12px;
    margin-bottom:18px;
}

.header h1{
    margin:0;
    font-size:23px;
}

.header p{
    margin:5px 0 0;
    font-size:13px;
}

.print-info{
    display:flex;
    justify-content:space-between;
    margin-bottom:12px;
    font-size:12px;
}

table{
    width:100%;
    border-collapse:collapse;
}

th,td{
    border:1px solid #9aa4b2;
    padding:7px;
    font-size:12px;
    text-align:left;
}

th{
    background:#eef4ff;
    font-weight:800;
}

.footer{
    margin-top:18px;
    font-size:11px;
    text-align:center;
}

@media print{

    body{
        margin:10mm;
    }

    .no-print{
        display:none;
    }

}

</style>

</head>


<body>


<div class="header">

    <h1>
        Govt Higher Secondary School Damoh
    </h1>

    <p>
        Sandipani Digital Campus • IT–ITeS
    </p>

    <p>
        ${esc(heading)}
    </p>

</div>


<div class="print-info">

    <span>
        Total Students:
        <strong>${students.length}</strong>
    </span>

    <span>
        Date:
        <strong>
            ${new Date().toLocaleDateString("en-IN")}
        </strong>
    </span>

</div>


<table>

<thead>

<tr>

${fields.map(
    field =>
        `<th>${esc(labels[field] || field)}</th>`
).join("")}

</tr>

</thead>


<tbody>

${rows}

</tbody>

</table>


<div class="footer">

    Govt Sandipani HSS School Damoh<br>

    Vocational Education • IT–ITeS

</div>


<script>

window.onload = function(){

    setTimeout(function(){

        window.print();

    },400);

};

<\/script>


</body>

</html>
`;


    const win =
        window.open(
            "",
            "_blank"
        );


    if (!win) {

        alert(
            "Print window open नहीं हो सकी। Browser में pop-up allow करें।"
        );

        return;
    }


    win.document.open();

    win.document.write(html);

    win.document.close();
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(row) {

    if (!isLoggedIn) return;


    const s =
        studentsCache.find(
            x =>
                Number(x._row) ===
                Number(row)
        );


    if (!s) return;


    const data = {};


    [
        "Name",
        "Parent",
        "Class",
        "Section",
        "Roll",
        "Medium",
        "Mobile",
        "Trade",
        "Job Role",
        "Stream",
        "Status"
    ]
    .forEach(k => {

        data[k] =
            prompt(
                k,
                s[k] ?? ""
            ) ?? s[k] ?? "";

    });


    updateStudent(
        row,
        data
    );
}


/* =========================================================
   UPDATE STUDENT
   ========================================================= */

async function updateStudent(
    row,
    data
) {

    try {

        await apiCall(
            "updateStudent",
            {
                pin: adminPin,
                row: row,
                data: data
            }
        );


        adminMsg(
            "✅ Student updated.",
            "ok"
        );


        await loadStats();

        await loadStudents();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   DELETE STUDENT
   ========================================================= */

async function deleteStudent(row) {

    if (!isLoggedIn) return;


    if (
        !confirm(
            "Delete this student and linked marks?"
        )
    ) {
        return;
    }


    try {

        await apiCall(
            "deleteStudent",
            {
                pin: adminPin,
                row: row
            }
        );


        adminMsg(
            "✅ Student deleted and moved to Deleted Records.",
            "ok"
        );


        await loadStats();

        await loadStudents();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   SAVE MARKS
   ========================================================= */

async function saveMarksForm() {

    if (!isLoggedIn) return;


    try {

        const data = {

            Class:
                v("mClass"),

            Roll:
                v("mRoll"),

            Subject:
                v("mSubject"),

            Theory:
                v("mTheory"),

            Practical:
                v("mPractical")

        };


        await apiCall(
            "saveMarks",
            {
                pin: adminPin,
                data: data
            }
        );


        adminMsg(
            "✅ Marks saved successfully.",
            "ok"
        );


        await loadStats();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   DELETED RECORDS
   ========================================================= */

async function loadDeleted() {

    if (!isLoggedIn) return;


    try {

        const r =
            await apiCall(
                "deleted",
                {
                    pin: adminPin
                }
            );


        const body =
            document.getElementById(
                "deletedRows"
            );


        if (!body) return;


        body.innerHTML =
            (r.result || [])
            .map(x => `

                <tr>

                    <td>
                        ${esc(x.deletedAt)}
                    </td>

                    <td>
                        ${esc(x.type)}
                    </td>

                    <td>

                        <button
                            class="mini green"
                            onclick="restore(${x.row})"
                        >
                            Restore
                        </button>

                    </td>

                </tr>

            `)
            .join("")

            ||

            `
            <tr>
                <td colspan="3">
                    No deleted records.
                </td>
            </tr>
            `;

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   RESTORE
   ========================================================= */

async function restore(row) {

    if (!isLoggedIn) return;


    try {

        await apiCall(
            "restore",
            {
                pin: adminPin,
                row: row
            }
        );


        adminMsg(
            "✅ Record restored.",
            "ok"
        );


        await loadStats();

        await loadStudents();

        await loadDeleted();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettings() {

    if (!isLoggedIn) return;


    try {

        const r =
            await apiCall(
                "settings",
                {
                    pin: adminPin
                }
            );


        currentSettings =
            r.settings || [];


        renderSettings();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   RENDER SETTINGS
   ========================================================= */

function renderSettings() {

    const box =
        document.getElementById(
            "settingsBox"
        );


    if (!box) return;


    box.innerHTML =
        currentSettings
        .map(
            (s, i) => `

            <div
                class="setting-row"
                data-i="${i}"
            >

                <input
                    value="${escAttr(s.field)}"
                    class="sf"
                >


                <select class="st">

                    <option
                        ${s.type === "text"
                            ? "selected"
                            : ""}
                    >
                        text
                    </option>

                    <option
                        ${s.type === "dropdown"
                            ? "selected"
                            : ""}
                    >
                        dropdown
                    </option>

                </select>


                <input
                    value="${escAttr(s.options)}"
                    class="so"
                    placeholder="Option1|Option2"
                >


                <select class="sr">

                    <option
                        ${s.required
                            ? "selected"
                            : ""}
                    >
                        Yes
                    </option>

                    <option
                        ${!s.required
                            ? "selected"
                            : ""}
                    >
                        No
                    </option>

                </select>


                <select class="se">

                    <option
                        ${s.enabled
                            ? "selected"
                            : ""}
                    >
                        Yes
                    </option>

                    <option
                        ${!s.enabled
                            ? "selected"
                            : ""}
                    >
                        No
                    </option>

                </select>


                <input
                    value="${escAttr(s.onlyClasses)}"
                    class="sc"
                    placeholder="All or 9th|10th"
                >

            </div>

        `
        )
        .join("");
}


/* =========================================================
   SAVE SETTINGS
   ========================================================= */

async function saveSettingsForm() {

    if (!isLoggedIn) return;


    try {

        const arr =
            [
                ...document.querySelectorAll(
                    ".setting-row"
                )
            ]
            .map(r => ({

                field:
                    r.querySelector(
                        ".sf"
                    ).value,

                type:
                    r.querySelector(
                        ".st"
                    ).value,

                options:
                    r.querySelector(
                        ".so"
                    ).value,

                required:
                    r.querySelector(
                        ".sr"
                    ).value === "Yes",

                enabled:
                    r.querySelector(
                        ".se"
                    ).value === "Yes",

                onlyClasses:
                    r.querySelector(
                        ".sc"
                    ).value ||
                    "All"

            }));


        await apiCall(
            "saveSettings",
            {
                pin: adminPin,
                settings: arr
            }
        );


        adminMsg(
            "✅ Form settings saved.",
            "ok"
        );


        await loadSettings();

    }
    catch (e) {

        adminMsg(
            e.message,
            "error"
        );

    }
}


/* =========================================================
   ADD SETTING
   ========================================================= */

function addSetting() {

    if (!isLoggedIn) return;


    currentSettings.push({

        field:
            "New Field",

        type:
            "text",

        options:
            "",

        required:
            false,

        enabled:
            true,

        onlyClasses:
            "All"

    });


    renderSettings();
}


/* =========================================================
   SEARCH COMPATIBILITY
   ========================================================= */

document.addEventListener(
    "input",
    function(event) {

        if (
            event.target.id ===
            "studentSearch"
        ) {

            if (isLoggedIn) {
                loadStudents();
            }

        }

    }
);


/* =========================================================
   PAGE INITIAL LOCK
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        /*
          Very important:
          Admin panel will NEVER be visible
          before PIN verification.
        */

        lockAdminPanel();


        /*
          Enter key on PIN field
        */

        const pin =
            document.getElementById(
                "adminPin"
            );


        if (pin) {

            pin.addEventListener(
                "keydown",
                function(e) {

                    if (
                        e.key ===
                        "Enter"
                    ) {

                        e.preventDefault();

                        adminLogin();

                    }

                }
            );

        }

    }
);
