const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9gpdO-SPNsh1x7l46gTGrbbNmr9ST88JA7nvYmzlsBdIQgqKuj9GMBSQXHCCePayF/exec";
const SESSION_PASSWORD_KEY = "personal-todo-session-password";

const authPanel = document.querySelector("#authPanel");
const authForm = document.querySelector("#authForm");
const passwordInput = document.querySelector("#passwordInput");
const authError = document.querySelector("#authError");
const todoApp = document.querySelector("#todoApp");
const todoForm = document.querySelector("#todoForm");
const itemInput = document.querySelector("#itemInput");
const dueInput = document.querySelector("#dueInput");
const descriptionInput = document.querySelector("#descriptionInput");
const submitTodoButton = document.querySelector("#submitTodoButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const todoList = document.querySelector("#todoList");
const todoCount = document.querySelector("#todoCount");
const emptyState = document.querySelector("#emptyState");
const lockButton = document.querySelector("#lockButton");
const clearDoneButton = document.querySelector("#clearDoneButton");
const syncStatus = document.querySelector("#syncStatus");

let todos = [];
let sessionPassword = sessionStorage.getItem(SESSION_PASSWORD_KEY) || "";
let isBusy = false;
let editingTodoId = "";

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

function sortedTodos() {
  return [...todos].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    if (a.dueDate === b.dueDate) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return a.dueDate.localeCompare(b.dueDate);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dueClass(dueDate) {
  if (!dueDate) return "";
  const today = todayString();
  const diff = Math.ceil((new Date(dueDate) - new Date(today)) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "due-soon";
  return "";
}

function setStatus(message, tone = "") {
  syncStatus.textContent = message;
  syncStatus.dataset.tone = tone;
}

function setBusy(busy) {
  isBusy = busy;
  const controls = [
    passwordInput,
    itemInput,
    dueInput,
    descriptionInput,
    lockButton,
    clearDoneButton,
    cancelEditButton,
    ...document.querySelectorAll("button[type='submit']"),
    ...document.querySelectorAll("[data-action]"),
  ];
  controls.forEach((control) => {
    control.disabled = busy;
  });
}

function ensureApiConfigured() {
  if (APPS_SCRIPT_URL) return true;
  authError.textContent = "Google Apps Script Web App URL을 script.js에 입력해야 합니다.";
  setStatus("Google Sheets 연결 설정이 필요합니다.", "error");
  return false;
}

function requestApi(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    return Promise.reject(new Error("Google Apps Script Web App URL이 비어 있습니다."));
  }

  const callbackName = `todoCallback_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("callback", callbackName);
  url.searchParams.set("action", action);

  Object.entries(payload).forEach(([key, value]) => {
    url.searchParams.set(key, value == null ? "" : String(value));
  });

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets 응답이 지연되고 있습니다."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      cleanup();
      if (!response || response.ok !== true) {
        reject(new Error(response?.message || "요청 처리에 실패했습니다."));
        return;
      }
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Apps Script에 연결할 수 없습니다."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function loadTodos() {
  const response = await requestApi("list", { password: sessionPassword });
  applyTodos(response);
}

function applyTodos(response) {
  todos = Array.isArray(response.todos) ? response.todos : [];
  renderTodos();
}

function setEditMode(todo) {
  editingTodoId = todo.id;
  itemInput.value = todo.item || "";
  dueInput.value = todo.dueDate || "";
  descriptionInput.value = todo.description || "";
  submitTodoButton.textContent = "저장";
  cancelEditButton.classList.remove("hidden");
  setStatus("수정할 내용을 입력한 뒤 저장하세요.");
  itemInput.focus();
}

function clearEditMode() {
  editingTodoId = "";
  todoForm.reset();
  submitTodoButton.textContent = "추가";
  cancelEditButton.classList.add("hidden");
}

function renderTodos() {
  const visibleTodos = sortedTodos();
  todoList.innerHTML = visibleTodos
    .map((todo) => {
      const description = todo.description
        ? `<p class="description">${escapeHtml(todo.description)}</p>`
        : "";
      const dueText = todo.dueDate ? formatDate(todo.dueDate) : "";

      return `
        <tr class="${todo.done ? "done" : ""}">
          <td class="check-cell">
            <input
              type="checkbox"
              aria-label="${escapeHtml(todo.item)} 완료"
              data-action="toggle"
              data-id="${escapeHtml(todo.id)}"
              ${todo.done ? "checked" : ""}
            />
          </td>
          <td class="date-text">${formatDate(todo.createdAt)}</td>
          <td>
            <div class="item-title">${escapeHtml(todo.item)}</div>
            ${description}
          </td>
          <td class="date-text ${dueClass(todo.dueDate)}">${dueText}</td>
          <td>
            <div class="row-actions">
              <button class="edit-button" type="button" data-action="edit" data-id="${escapeHtml(todo.id)}">
                수정
              </button>
              <button class="delete-button" type="button" data-action="delete" data-id="${escapeHtml(todo.id)}">
                삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  todoCount.textContent = `${todos.length}개 항목`;
  emptyState.classList.toggle("visible", todos.length === 0);
}

async function unlock(password) {
  if (!ensureApiConfigured()) return;

  setBusy(true);
  authError.textContent = "";
  setStatus("Google Sheets에서 목록을 불러오는 중입니다.");

  try {
    sessionPassword = password;
    sessionStorage.setItem(SESSION_PASSWORD_KEY, password);
    await loadTodos();
    authPanel.classList.add("hidden");
    todoApp.classList.remove("hidden");
    passwordInput.value = "";
    setStatus("Google Sheets와 연결되었습니다.", "success");
    itemInput.focus();
  } catch (error) {
    sessionPassword = "";
    sessionStorage.removeItem(SESSION_PASSWORD_KEY);
    authError.textContent = error.message;
    setStatus("연결 또는 인증에 실패했습니다.", "error");
    passwordInput.select();
  } finally {
    setBusy(false);
  }
}

function lock() {
  sessionPassword = "";
  todos = [];
  sessionStorage.removeItem(SESSION_PASSWORD_KEY);
  clearEditMode();
  todoApp.classList.add("hidden");
  authPanel.classList.remove("hidden");
  renderTodos();
  setStatus("");
  passwordInput.focus();
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlock(passwordInput.value);
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = itemInput.value.trim();

  if (!item || isBusy) {
    itemInput.focus();
    return;
  }

  setBusy(true);
  setStatus(editingTodoId ? "수정 내용을 저장하는 중입니다." : "항목을 저장하는 중입니다.");

  try {
    const payload = {
      password: sessionPassword,
      item,
      dueDate: dueInput.value,
      description: descriptionInput.value.trim(),
    };
    const wasEditing = Boolean(editingTodoId);
    const response = wasEditing
      ? await requestApi("update", { ...payload, id: editingTodoId })
      : await requestApi("add", { ...payload, createdAt: todayString() });
    applyTodos(response);
    clearEditMode();
    setStatus(wasEditing ? "수정되었습니다." : "저장되었습니다.", "success");
    itemInput.focus();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
  }
});

todoList.addEventListener("click", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (!action || !id || isBusy) return;

  if (action === "edit") {
    const todo = todos.find((item) => item.id === id);
    if (todo) setEditMode(todo);
    return;
  }

  setBusy(true);
  setStatus("변경 내용을 저장하는 중입니다.");

  try {
    if (action === "delete") {
      const response = await requestApi("delete", { password: sessionPassword, id });
      applyTodos(response);
      if (editingTodoId === id) clearEditMode();
    }

    if (action === "toggle") {
      const response = await requestApi("update", {
        password: sessionPassword,
        id,
        done: target.checked ? "true" : "false",
      });
      applyTodos(response);
    }

    setStatus("변경되었습니다.", "success");
  } catch (error) {
    target.checked = !target.checked;
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
  }
});

clearDoneButton.addEventListener("click", async () => {
  if (isBusy) return;

  setBusy(true);
  setStatus("완료 항목을 삭제하는 중입니다.");

  try {
    const response = await requestApi("clearDone", { password: sessionPassword });
    applyTodos(response);
    setStatus("완료 항목을 삭제했습니다.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
  }
});

cancelEditButton.addEventListener("click", () => {
  clearEditMode();
  setStatus("수정을 취소했습니다.");
  itemInput.focus();
});

lockButton.addEventListener("click", lock);

renderTodos();

if (sessionPassword) {
  unlock(sessionPassword);
} else {
  lock();
}
