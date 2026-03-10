import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_DI4_moMBsKefGcIMJyzbRiQUhv185lA",
  authDomain: "soamcqtest.firebaseapp.com",
  projectId: "soamcqtest",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const schoolInput = document.getElementById("school");
const nameInput = document.getElementById("name");
const startBox = document.getElementById("startBox");
const quizBox = document.getElementById("quizBox");
const resultBox = document.getElementById("resultBox");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownBox = document.getElementById("countdownBox");
const customAlert = document.getElementById("customAlert");
const alertMessage = document.getElementById("alertMessage");


function showNotify(message) {

    const container = document.getElementById("notifyContainer");

    const notify = document.createElement("div");
    notify.className = "glass-notify";
    notify.innerText = message;

    container.appendChild(notify);

    setTimeout(() => {
        notify.classList.add("hide");

        setTimeout(() => {
            notify.remove();
        }, 300);

    }, 2500);

}
function showGlassAlert(title, message) {

    const alertBox = document.getElementById("customAlert");
    const text = document.getElementById("alertMessage");

    text.innerHTML = `
    <div class="glass-title">${title}</div>
    <div class="glass-msg">${message}</div>
  `;

    alertBox.classList.add("active");

    setTimeout(() => {
        alertBox.classList.remove("active");
    }, 3000);

}

function getDeviceId() { let id = localStorage.getItem("deviceId"); if (!id) { id = 'dev_' + Math.random().toString(36).substr(2, 16); localStorage.setItem("deviceId", id); } return id; }
let questions = [], current = 0, score = 0, timer, timeLeft = 60, currentDeviceId;



// ------------------ Sunday + Time Restriction with Typing Effect ------------------
function checkQuizAvailability() {
    const now = new Date();
    const day = now.getDay(); // Sunday = 0
    const hour = now.getHours();

    function showTypingPopup(message) {
        alertMessage.innerHTML = "";              // clear old text
        customAlert.style.opacity = "0";
        customAlert.classList.add("active");

        // Fade-in
        setTimeout(() => { customAlert.style.transition = "opacity 0.5s"; customAlert.style.opacity = "1"; }, 50);

        // Typing effect with emoji + line breaks
        let idx = 0;
        const typingSpeed = 50; // milliseconds per character
        const typeInterval = setInterval(() => {
            if (idx < message.length) {
                alertMessage.innerHTML += message.charAt(idx) === "\n" ? "<br>" : message.charAt(idx);
                idx++;
            } else {
                clearInterval(typeInterval);
            }
        }, typingSpeed);
    }

    // ------------------ Sunday check ------------------
    if (false) { // Not Sunday
        startBox.style.display = "none";
        quizBox.style.display = "none";
        showTypingPopup("🚫 Quiz Available Only on Sunday!\nPlease Come Back Next Sunday 🔥");
        return false;
    }

    // ------------------ Time restriction ------------------
    if (hour < 6) {
        startBox.style.display = "none";
        quizBox.style.display = "none";
        showTypingPopup("🌅 Good Morning!\nQuiz Opens At 6:00 AM\nPlease Come Back Soon 🔥");
        return false;
    }

    if (hour >= 18) {
        startBox.style.display = "none";
        quizBox.style.display = "none";
        showTypingPopup("🌙 Quiz Time Over!\nQuiz Available From 6:00 AM - 6:00 PM\nSee You Next Day 🔥");
        return false;
    }

    customAlert.classList.remove("active");
    return true;
}


async function loadQuestionsFromJSON() {
    try {
        const response = await fetch("questions.json");
        questions = await response.json();
        questions.sort(() => Math.random() - 0.5);
    } catch (error) {
        console.error("Error loading questions:", error);
        showAlert("Failed to load questions!");
    }
}

// ------------------ Device check ------------------
async function hasPlayedDevice(deviceId) {
    const q = query(collection(db, "participants"), where("deviceId", "==", deviceId));
    const snap = await getDocs(q);
    return !snap.empty;
}

// ------------------ Prepare Quiz with daily limit ------------------
window.prepareQuiz = async function () {

    if (!checkQuizAvailability()) return;

    await loadQuestionsFromJSON();

    const school = schoolInput.value.trim();
    const name = nameInput.value.trim();

    if (!school || !name) {
        showGlassAlert("⚠️ Missing Details", "කරුණාකර School Name සහ Your Name අතුලත් කරන්න.");
        return;
    }

    currentDeviceId = getDeviceId();

    if (await hasPlayedDevice(currentDeviceId)) {
        showGlassAlert("🚫 Submission Blocked", "ඔබ දැනටමත් quiz එක play කර ඇත!");
        return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const q = query(
        collection(db, "participants"),
        where("timestamp", ">=", todayStart)
    );

    const snap = await getDocs(q);

    let todayCount = snap.size;

    if (todayCount >= 1000) {
        showGlassAlert("⚡ Server Limit Reached 5000+");
        return;
    }
    let numbers = [3, 2, 1];
    let idx = 0;

    countdownOverlay.classList.add("active");

    function showCount() {
        countdownBox.innerHTML = `🌱 Quiz Starting<br>${numbers[idx]}`;
        countdownBox.style.animation = "none";
        countdownBox.offsetHeight;
        countdownBox.style.animation = "countAnim 0.6s ease";

        idx++;

        if (idx < numbers.length) {
            setTimeout(showCount, 1500);
        } else {
            setTimeout(() => {
                countdownOverlay.classList.remove("active");
                startQuiz();
            }, 1500);
        }
    }

    showCount();
}

// ------------------ Start Quiz ------------------
window.startQuiz = function () {

  startBox.style.display = "none";
  quizBox.style.display = "block";

  document.body.style.animation = "none";

  helpBtn.style.display = "none";

  current = 0;
  score = 0;

  loadQuestion();

}

function loadQuestion() {
    if (current >= questions.length) { finish(); return; }
    const q = questions[current];
    let html = `<h3>${current + 1}. ${q.q}</h3>`;
    q.options.forEach((o, i) => { html += `<div class="option" onclick="selectAns(${i})">${o}</div>`; });
    html += `<div id="progressContainer"><div id="progressBar"></div></div>`;
    quizBox.innerHTML = html; quizBox.classList.add("slide-in");
    setTimeout(() => quizBox.classList.remove("slide-in"), 1500);

    timeLeft = 60;
    const progressBar = document.getElementById("progressBar"); progressBar.style.width = "100%"; progressBar.style.background = "var(--accent)";
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        progressBar.style.width = (timeLeft / 60 * 100) + "%";
        if (timeLeft <= 0) { clearInterval(timer); selectAns(-1); }
    }, 1500);
}

window.selectAns = function (i) {
    clearInterval(timer);
    const options = document.querySelectorAll(".option");
    const correct = questions[current].answer;
    const progressBar = document.getElementById("progressBar");

    options.forEach((el, idx) => {
        el.style.pointerEvents = "none";
        if (idx === correct) { el.style.background = "green"; el.style.color = "white"; progressBar.style.background = "green"; if (i === correct) sunflowerConfetti(); }
        if (idx === i && i !== correct) { el.style.background = "red"; el.style.color = "white"; el.innerText = "❌ " + el.innerText; progressBar.style.background = "red"; }
    });

    if (i === correct) score++;
    setTimeout(() => { current++; loadQuestion(); }, 1500);
}

// ---------------- Submit Quiz to Firestore ----------------
async function finish() {
    quizBox.style.display = "none"; resultBox.style.display = "block";

    document.body.style.animation = "slowMove 40s linear infinite";

    // show buttons again
    helpBtn.style.display = "block";

    const now = new Date();
    const month = now.getMonth() + 1;

    document.body.style.background =
        "linear-gradient(-45deg,#2e7d32,#66bb6a,#a5d6a7,#c8e6c9)";

    await addDoc(collection(db, "participants"), {
        key: nameInput.value + " : " + schoolInput.value,
        score,
        timestamp: serverTimestamp(),
        deviceId: currentDeviceId,
        month: month
    });

    if (score >= questions.length * 0.75) {
        sunflowerConfetti();
    }


    resultBox.innerHTML = `
<lottie-player 
src="https://assets9.lottiefiles.com/packages/lf20_touohxv0.json"
background="transparent"
speed="1"
style="width:150px;height:150px;margin:auto"
autoplay>
</lottie-player>

<h2>Your Score: ${score}</h2>
<h3 id="returnTimer">Returning to Home in 10s</h3>
`;


    updatePlayedCount();

    let waitTime = 10; const returnTimer = document.getElementById("returnTimer");
    const countdown = setInterval(() => {
        waitTime--; if (waitTime > 0) returnTimer.innerText = `Returning to Home in ${waitTime}s`; else { clearInterval(countdown); location.reload(); }
    }, 1000);
}

async function updatePlayedCount() {
    const playedNumber = document.getElementById("playedNumber");
    const snap = await getDocs(collection(db, "participants"));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    let count = 0;
    snap.forEach(doc => { const t = doc.data().timestamp?.toMillis(); if (t >= todayStart && t < todayEnd) count++; });
    playedNumber.innerText = count;
}
updatePlayedCount();
checkQuizAvailability();

window.toggleMode = function () { document.body.classList.toggle("dark"); const icon = document.getElementById("modeIcon"); if (document.body.classList.contains("dark")) icon.classList.replace("fa-sun", "fa-moon"); else icon.classList.replace("fa-moon", "fa-sun"); }
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    showNotify("🖱 Right Click Disabled");
});

document.addEventListener('copy', e => {
    e.preventDefault();
    showNotify("📋 Copy Disabled");
});

document.addEventListener('cut', e => {
    e.preventDefault();
    showNotify("✂️ Cut Disabled");
});

document.addEventListener('paste', e => {
    e.preventDefault();
    showNotify("📥 Paste Disabled");
});

// Help Popup
const helpBtn = document.getElementById("helpBtn");
const helpPopup = document.getElementById("helpPopup");
const closeHelp = document.getElementById("closeHelp");

helpBtn.addEventListener("click", function (e) {
    e.preventDefault();
    helpPopup.classList.add("active");
});

closeHelp.addEventListener("click", function () {
    helpPopup.classList.remove("active");
});

// Developer Popup Safe Script

const devBtn = document.getElementById("devBtn");
const devPopup = document.getElementById("devPopup");
const closeDev = document.getElementById("closeDev");

if (devBtn && devPopup && closeDev) {

    devBtn.addEventListener("click", function (e) {
        e.preventDefault();
        devPopup.classList.add("active");
    });

    closeDev.addEventListener("click", function () {
        devPopup.classList.remove("active");
    });

    devPopup.addEventListener("click", function (e) {
        if (e.target === devPopup) {
            devPopup.classList.remove("active");
        }
    });

}
/* ================= FARM SKY BACKGROUND ================= */

const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* Clouds */

let clouds = [];

for (let i = 0; i < 20; i++) {
    clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        size: 60 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.3
    });
}

/* Draw */

function animate() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Sky */

    ctx.fillStyle = "#b3e5fc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Clouds */

    clouds.forEach(c => {

        ctx.fillStyle = "white";

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 0.4, 0, Math.PI * 2);
        ctx.arc(c.x + 30, c.y, c.size * 0.5, 0, Math.PI * 2);
        ctx.arc(c.x - 30, c.y, c.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        c.x += c.speed;

        if (c.x > canvas.width + 100) {
            c.x = -100;
        }

    });

    requestAnimationFrame(animate);

}

animate();
function createLeaf() {

    const leaf = document.createElement("div");
    leaf.className = "leaf";

    leaf.style.left = Math.random() * 100 + "vw";
    leaf.style.animationDuration = (5 + Math.random() * 5) + "s";

    document.body.appendChild(leaf);

    setTimeout(() => { leaf.remove() }, 10000);

}

setInterval(createLeaf, 2000);
function sunflowerConfetti() {

    for (let i = 0; i < 6; i++) {

        const flower = document.createElement("div");
        flower.innerText = "🌻";
        flower.className = "sunflower";

        flower.style.left = Math.random() * 100 + "vw";
        flower.style.animationDuration = (3 + Math.random() * 3) + "s";

        document.body.appendChild(flower);

        setTimeout(() => flower.remove(), 6000);

    }

}