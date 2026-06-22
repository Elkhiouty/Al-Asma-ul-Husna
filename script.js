const APP_CONSTANTS = window.appConstants;

const arabicNameEl = document.getElementById("arabicName");
const arabicExplanationEl = document.getElementById("arabicExplanation");
const englishMeaningEl = document.getElementById("englishMeaning");
const nameCounterEl = document.getElementById("nameCounter");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const saveNameBtn = document.getElementById("saveNameBtn");
const todayBtn = document.getElementById("todayBtn");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const quizMenuBtn = document.getElementById("quizMenuBtn");
const quizStartBeginningBtn = document.getElementById("quizStartBeginningBtn");
const quizStartCurrentBtn = document.getElementById("quizStartCurrentBtn");
const savedCountEl = document.getElementById("savedCount");
const remainingCountEl = document.getElementById("remainingCount");
const streakCountEl = document.getElementById("streakCount");
const learningModeEl = document.getElementById("learningMode");
const quizModeEl = document.getElementById("quizMode");
const quizProgressEl = document.getElementById("quizProgress");
const quizTapAreaEl = document.getElementById("quizTapArea");
const quizNumberEl = document.getElementById("quizNumber");
const quizStatusEl = document.getElementById("quizStatus");
const quizRevealBtn = document.getElementById("quizRevealBtn");
const quizGoToNextBtn = document.getElementById("quizGoToNextBtn");
const quizExitBtn = document.getElementById("quizExitBtn");
const quizRevealedListEl = document.getElementById("quizRevealedList");
const primaryNavRowEl = document.getElementById("primaryNavRow");
const quickNavRowEl = document.getElementById("quickNavRow");
const firstBtn = document.getElementById("firstBtn");
const lastBtn = document.getElementById("lastBtn");
const jumpBackTenBtn = document.getElementById("jumpBackTenBtn");
const jumpForwardTenBtn = document.getElementById("jumpForwardTenBtn");
const nearbyNavEl = document.getElementById("nearbyNav");

let currentIndex = 0;

const quizState = {
  isActive: false,
  currentQuizIndex: 0,
  quizList: [],
  isCompleted: false
};

let lastQuizActionAt = 0;

function getUtcDayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getUtcDayDifference(previousDay, currentDay) {
  const prevTime = Date.parse(`${previousDay}T00:00:00Z`);
  const currTime = Date.parse(`${currentDay}T00:00:00Z`);

  if (Number.isNaN(prevTime) || Number.isNaN(currTime)) {
    return 0;
  }

  return Math.floor((currTime - prevTime) / APP_CONSTANTS.MILLISECONDS_PER_DAY);
}

function loadMemorizationState() {
  const defaultState = {
    savedNameIndexes: [],
    lastSavedUtcDay: null,
    streak: 0
  };

  try {
    const rawValue = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY);
    if (!rawValue) {
      return defaultState;
    }

    const parsed = JSON.parse(rawValue);
    const uniqueSortedIndexes = Array.isArray(parsed.savedNameIndexes)
      ? [...new Set(parsed.savedNameIndexes.filter((value) => Number.isInteger(value) && value >= 0 && value < APP_CONSTANTS.namesOfAllah.length))].sort((a, b) => a - b)
      : [];

    return {
      savedNameIndexes: uniqueSortedIndexes,
      lastSavedUtcDay: typeof parsed.lastSavedUtcDay === "string" ? parsed.lastSavedUtcDay : null,
      streak: Number.isInteger(parsed.streak) && parsed.streak >= 0 ? parsed.streak : 0
    };
  } catch (error) {
    return defaultState;
  }
}

const memorizationState = loadMemorizationState();

function persistMemorizationState() {
  localStorage.setItem(
    APP_CONSTANTS.STORAGE_KEY,
    JSON.stringify({
      savedNameIndexes: memorizationState.savedNameIndexes,
      lastSavedUtcDay: memorizationState.lastSavedUtcDay,
      streak: memorizationState.streak
    })
  );
}

function getExpectedNextIndex() {
  return memorizationState.savedNameIndexes.length;
}

function markDailyActivityIfNeeded() {
  const today = getUtcDayString();

  if (!memorizationState.lastSavedUtcDay) {
    memorizationState.lastSavedUtcDay = today;
    memorizationState.streak = 1;
    persistMemorizationState();
    return;
  }

  const dayDifference = getUtcDayDifference(memorizationState.lastSavedUtcDay, today);

  if (dayDifference === 1) {
    memorizationState.streak += 1;
    memorizationState.lastSavedUtcDay = today;
    persistMemorizationState();
  } else if (dayDifference > 1) {
    memorizationState.streak = 1;
    memorizationState.lastSavedUtcDay = today;
    persistMemorizationState();
  }
}

function updateButtons() {
  if (quizState.isActive) {
    backBtn.disabled = true;
    nextBtn.disabled = true;
    saveNameBtn.disabled = true;
    todayBtn.disabled = true;
    resetProgressBtn.disabled = true;
    quizMenuBtn.disabled = true;
    quizStartBeginningBtn.disabled = true;
    quizStartCurrentBtn.disabled = true;
    return;
  }

  backBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === APP_CONSTANTS.namesOfAllah.length - 1;
  todayBtn.disabled = false;
  resetProgressBtn.disabled = memorizationState.savedNameIndexes.length === 0;

  const expectedNextIndex = getExpectedNextIndex();
  const isAlreadySaved = memorizationState.savedNameIndexes.includes(currentIndex);
  saveNameBtn.disabled = isAlreadySaved || currentIndex !== expectedNextIndex;

  if (isAlreadySaved) {
    saveNameBtn.textContent = "Memorized";
  } else if (currentIndex === expectedNextIndex) {
    saveNameBtn.textContent = "Memorize";
  } else {
    saveNameBtn.textContent = "Memorize Previous First";
  }

  const isQuizDisabled = memorizationState.savedNameIndexes.length === 0;
  const isCurrentNameSaved = memorizationState.savedNameIndexes.includes(currentIndex);
  const lastSavedIndex = memorizationState.savedNameIndexes[memorizationState.savedNameIndexes.length - 1];
  const isCurrentLastSaved = isCurrentNameSaved && currentIndex === lastSavedIndex;
  quizMenuBtn.disabled = isQuizDisabled;
  quizStartBeginningBtn.disabled = isQuizDisabled;
  quizStartCurrentBtn.disabled = isQuizDisabled || !isCurrentNameSaved || isCurrentLastSaved;
}

function renderProgress() {
  const savedCount = memorizationState.savedNameIndexes.length;
  savedCountEl.textContent = `${savedCount}`;
  remainingCountEl.textContent = `${APP_CONSTANTS.namesOfAllah.length - savedCount}`;
  streakCountEl.textContent = `${memorizationState.streak}`;
}

function clampIndex(value) {
  return Math.max(0, Math.min(value, APP_CONSTANTS.namesOfAllah.length - 1));
}

function goToIndex(targetIndex) {
  currentIndex = clampIndex(targetIndex);
  renderName();
}

function jumpBy(amount) {
  goToIndex(currentIndex + amount);
}

function getNearbyRange(windowSize = 5) {
  const total = APP_CONSTANTS.namesOfAllah.length;
  const size = Math.max(1, Math.min(windowSize, total));
  const leftSpan = Math.floor(size / 2);
  let start = currentIndex - leftSpan;
  let end = start + size - 1;

  if (start < 0) {
    end += -start;
    start = 0;
  }

  if (end > total - 1) {
    const overflow = end - (total - 1);
    start = Math.max(0, start - overflow);
    end = total - 1;
  }

  return { start, end };
}

function renderNearbyNavButtons() {
  if (!nearbyNavEl) {
    return;
  }

  nearbyNavEl.innerHTML = "";
  const { start, end } = getNearbyRange(5);

  for (let index = start; index <= end; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline-light quick-nearby-btn";
    button.dataset.targetIndex = `${index}`;
    button.textContent = `${index + 1}`;
    button.setAttribute("aria-label", `Go to name ${index + 1}`);

    const isCurrent = index === currentIndex;
    button.classList.toggle("is-active", isCurrent);
    button.setAttribute("aria-current", isCurrent ? "true" : "false");

    nearbyNavEl.appendChild(button);
  }
}

function updateQuickNavState() {
  const isQuizActive = quizState.isActive;
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === APP_CONSTANTS.namesOfAllah.length - 1;

  firstBtn.disabled = isQuizActive || isAtStart;
  lastBtn.disabled = isQuizActive || isAtEnd;
  jumpBackTenBtn.disabled = isQuizActive || isAtStart;
  jumpForwardTenBtn.disabled = isQuizActive || isAtEnd;

  renderNearbyNavButtons();

  if (!nearbyNavEl) {
    return;
  }

  nearbyNavEl.classList.toggle("is-disabled", isQuizActive);
  const nearbyButtons = nearbyNavEl.querySelectorAll(".quick-nearby-btn");
  nearbyButtons.forEach((button) => {
    button.disabled = isQuizActive;
  });
}

function renderName() {
  const currentName = APP_CONSTANTS.namesOfAllah[currentIndex];
  arabicNameEl.textContent = currentName.arabic;
  arabicExplanationEl.textContent = currentName.arabicExplanation || "";
  englishMeaningEl.textContent = currentName.meaning;
  nameCounterEl.textContent = `${currentIndex + 1} / ${APP_CONSTANTS.namesOfAllah.length}`;

  renderProgress();
  updateButtons();
  updateQuickNavState();
}

function saveCurrentNameInOrder() {
  const expectedNextIndex = getExpectedNextIndex();

  if (currentIndex !== expectedNextIndex) {
    return;
  }

  const wasComplete = memorizationState.savedNameIndexes.length === APP_CONSTANTS.namesOfAllah.length;
  memorizationState.savedNameIndexes.push(currentIndex);
  markDailyActivityIfNeeded();
  persistMemorizationState();
  goToIndex(currentIndex + 1);

  const isComplete = memorizationState.savedNameIndexes.length === APP_CONSTANTS.namesOfAllah.length;
  if (!wasComplete && isComplete) {
    window.alert("You've memorized all 99 Names of Allah!");
  }
}

function resetMemorizationProgress() {
  if (quizState.isActive) {
    return;
  }

  if (memorizationState.savedNameIndexes.length === 0 && memorizationState.streak === 0 && !memorizationState.lastSavedUtcDay) {
    return;
  }

  const isConfirmed = window.confirm("Reset all memorized names and streak progress?");

  if (!isConfirmed) {
    return;
  }

  memorizationState.savedNameIndexes = [];
  memorizationState.lastSavedUtcDay = null;
  memorizationState.streak = 0;
  persistMemorizationState();
  goToTodayName();
}

function renderQuizStep() {
  const total = quizState.quizList.length;
  const savedIndex = quizState.quizList[quizState.currentQuizIndex];

  quizState.isCompleted = false;
  quizNumberEl.classList.remove("is-complete");
  quizProgressEl.textContent = `${quizState.currentQuizIndex + 1} / ${total}`;
  quizNumberEl.textContent = `${savedIndex + 1}`;
  quizRevealBtn.hidden = false;
  quizRevealBtn.disabled = false;
  quizGoToNextBtn.hidden = true;
  quizRevealBtn.textContent = "Reveal";
  quizStatusEl.textContent = "";
  quizTapAreaEl.classList.remove("is-disabled");
  quizTapAreaEl.setAttribute("aria-disabled", "false");
  quizTapAreaEl.tabIndex = 0;
  quizTapAreaEl.setAttribute("aria-label", `Current number ${savedIndex + 1}. Activate to reveal and move next.`);
  markCurrentRevealedItem(savedIndex);
}

function addRevealedQuizItem(savedIndex) {
  const existingItem = quizRevealedListEl.querySelector(`[data-saved-index="${savedIndex}"]`);
  if (existingItem) {
    markCurrentRevealedItem(savedIndex);
    return;
  }

  const item = document.createElement("li");
  item.className = "quiz-revealed-item";
  item.dataset.savedIndex = `${savedIndex}`;

  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.className = "quiz-revealed-jump";
  jumpButton.setAttribute("aria-label", `Jump back to number ${savedIndex + 1}`);

  const number = document.createElement("span");
  number.className = "quiz-revealed-number";
  number.textContent = `${savedIndex + 1}.`;

  const name = document.createElement("span");
  name.className = "quiz-revealed-name";
  name.lang = "ar";
  name.dir = "rtl";
  name.textContent = APP_CONSTANTS.namesOfAllah[savedIndex].arabic;

  jumpButton.append(number, name);
  item.append(jumpButton);
  quizRevealedListEl.appendChild(item);
  quizRevealedListEl.scrollTop = quizRevealedListEl.scrollHeight;
  markCurrentRevealedItem(savedIndex);
}

function markCurrentRevealedItem(savedIndex) {
  const listItems = quizRevealedListEl.querySelectorAll(".quiz-revealed-item");
  listItems.forEach((item) => {
    const isCurrent = Number(item.dataset.savedIndex) === savedIndex;
    item.classList.toggle("is-current", isCurrent);
  });
}

function showQuizCompletionState() {
  quizState.isCompleted = true;
  quizProgressEl.textContent = `${quizState.quizList.length} / ${quizState.quizList.length}`;
  quizNumberEl.classList.add("is-complete");
  quizNumberEl.textContent = "Congratulations";
  quizStatusEl.textContent = "Quiz completed! Ready to memorize the next name ?";
  quizRevealBtn.hidden = true;
  quizGoToNextBtn.hidden = true;
  quizTapAreaEl.classList.add("is-disabled");
  quizTapAreaEl.setAttribute("aria-disabled", "true");
  quizTapAreaEl.tabIndex = -1;
}

function startQuizMode(startMode = "beginning") {
  const saved = memorizationState.savedNameIndexes;

  if (saved.length === 0) {
    return;
  }

  let startIndex = 0;
  let prefetchedSavedIndex = null;

  if (startMode === "current") {
    const currentSavedIndex = saved.indexOf(currentIndex);

    if (currentSavedIndex >= 0) {
      prefetchedSavedIndex = saved[currentSavedIndex];
      startIndex = currentSavedIndex + 1;
    }
  }

  quizState.isActive = true;
  quizState.currentQuizIndex = startIndex;
  quizState.quizList = [...saved];
  quizState.isCompleted = false;
  lastQuizActionAt = 0;
  quizRevealedListEl.innerHTML = "";

  learningModeEl.hidden = true;
  quizModeEl.hidden = false;
  if (primaryNavRowEl) {
    primaryNavRowEl.style.visibility = "hidden";
    primaryNavRowEl.style.height = "0";
    primaryNavRowEl.style.overflow = "hidden";
  }
  if (quickNavRowEl) {
    quickNavRowEl.style.visibility = "hidden";
    quickNavRowEl.style.height = "0";
    quickNavRowEl.style.overflow = "hidden";
  }

  if (prefetchedSavedIndex !== null) {
    addRevealedQuizItem(prefetchedSavedIndex);
  }

  if (quizState.currentQuizIndex >= quizState.quizList.length) {
    showQuizCompletionState();
  } else {
    renderQuizStep();
  }

  updateButtons();
}

function handleQuizRevealOrNext() {
  if (!quizState.isActive) {
    return;
  }

  if (quizState.isCompleted) {
    return;
  }

  const now = Date.now();
  if (now - lastQuizActionAt < APP_CONSTANTS.QUIZ_ACTION_COOLDOWN_MS) {
    return;
  }
  lastQuizActionAt = now;

  if (quizState.currentQuizIndex >= quizState.quizList.length) {
    exitQuizToLearning(true);
    return;
  }

  const savedIndex = quizState.quizList[quizState.currentQuizIndex];
  addRevealedQuizItem(savedIndex);

  quizState.currentQuizIndex += 1;

  if (quizState.currentQuizIndex >= quizState.quizList.length) {
    showQuizCompletionState();
    return;
  }

  renderQuizStep();
}

function exitQuizToLearning(isCompleted = false) {
  quizState.isActive = false;
  quizState.currentQuizIndex = 0;
  quizState.quizList = [];
  quizState.isCompleted = false;

  quizModeEl.hidden = true;
  learningModeEl.hidden = false;
  if (primaryNavRowEl) {
    primaryNavRowEl.style.visibility = "visible";
    primaryNavRowEl.style.height = "";
    primaryNavRowEl.style.overflow = "";
  }
  if (quickNavRowEl) {
    quickNavRowEl.style.visibility = "visible";
    quickNavRowEl.style.height = "";
    quickNavRowEl.style.overflow = "";
  }

  if (isCompleted) {
    goToTodayName();
  }

  if (isCompleted) {
    // Intentionally no inline learning status message.
  }
}

function goToNextNameFromQuiz() {
  exitQuizToLearning(true);
}

function jumpToQuizItem(savedIndex) {
  if (!quizState.isActive) {
    return;
  }

  const quizIndex = quizState.quizList.indexOf(savedIndex);

  if (quizIndex === -1) {
    return;
  }

  // Trim revealed history after the jump target so review can continue from here.
  const revealedItems = Array.from(quizRevealedListEl.querySelectorAll(".quiz-revealed-item"));
  revealedItems.forEach((item) => {
    const itemSavedIndex = Number(item.dataset.savedIndex);
    const itemQuizIndex = quizState.quizList.indexOf(itemSavedIndex);

    if (itemQuizIndex > quizIndex) {
      item.remove();
    }
  });

  const nextQuizIndex = quizIndex + 1;

  if (nextQuizIndex >= quizState.quizList.length) {
    showQuizCompletionState();
    return;
  }

  quizState.currentQuizIndex = nextQuizIndex;
  renderQuizStep();
}

function goToTodayName() {
  const nextIndexToSave = getExpectedNextIndex();
  currentIndex = Math.min(nextIndexToSave, APP_CONSTANTS.namesOfAllah.length - 1);
  renderName();
}

function goToNextFromNameClick() {
  if (quizState.isActive) {
    return;
  }

  goToIndex(currentIndex + 1);
}

backBtn.addEventListener("click", () => {
  goToIndex(currentIndex - 1);
});

nextBtn.addEventListener("click", () => {
  goToIndex(currentIndex + 1);
});

firstBtn.addEventListener("click", () => goToIndex(0));
lastBtn.addEventListener("click", () => goToIndex(APP_CONSTANTS.namesOfAllah.length - 1));
jumpBackTenBtn.addEventListener("click", () => jumpBy(-10));
jumpForwardTenBtn.addEventListener("click", () => jumpBy(10));
arabicNameEl.addEventListener("click", goToNextFromNameClick);
arabicNameEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    goToNextFromNameClick();
  }
});
nearbyNavEl.addEventListener("click", (event) => {
  const button = event.target.closest(".quick-nearby-btn");

  if (!button || button.disabled) {
    return;
  }

  const targetIndex = Number(button.dataset.targetIndex);

  if (Number.isNaN(targetIndex)) {
    return;
  }

  goToIndex(targetIndex);
});

saveNameBtn.addEventListener("click", saveCurrentNameInOrder);
todayBtn.addEventListener("click", goToTodayName);
resetProgressBtn.addEventListener("click", resetMemorizationProgress);
quizStartBeginningBtn.addEventListener("click", () => startQuizMode("beginning"));
quizStartCurrentBtn.addEventListener("click", () => startQuizMode("current"));
quizRevealBtn.addEventListener("click", handleQuizRevealOrNext);
quizGoToNextBtn.addEventListener("click", goToNextNameFromQuiz);
quizTapAreaEl.addEventListener("click", handleQuizRevealOrNext);
quizTapAreaEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleQuizRevealOrNext();
  }
});
quizRevealedListEl.addEventListener("click", (event) => {
  const jumpButton = event.target.closest(".quiz-revealed-jump");

  if (!jumpButton) {
    return;
  }

  const item = jumpButton.closest(".quiz-revealed-item");

  if (!item) {
    return;
  }

  const savedIndex = Number(item.dataset.savedIndex);

  if (Number.isNaN(savedIndex)) {
    return;
  }

  jumpToQuizItem(savedIndex);
});
quizExitBtn.addEventListener("click", exitQuizToLearning);

goToTodayName();

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "s") {
    saveCurrentNameInOrder();
  }

  if (event.key.toLowerCase() === "t") {
    goToTodayName();
  }

  if (event.key === "ArrowLeft" && currentIndex > 0) {
    goToIndex(currentIndex - 1);
  }

  if (event.key === "ArrowRight" && currentIndex < APP_CONSTANTS.namesOfAllah.length - 1) {
    goToIndex(currentIndex + 1);
  }
});

renderName();
