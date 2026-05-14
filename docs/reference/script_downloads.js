const sectionMeta = {
  dashboard: { tag: "Team Link", title: "Dashboard", subtitle: "Espacio para que el equipo conecte rutas y componentes." },
  projects: { tag: "Team Link", title: "Projects", subtitle: "Espacio para que el equipo conecte rutas y componentes." },
  reports: { tag: "Team Link", title: "Reports", subtitle: "Espacio para que el equipo conecte rutas y componentes." },
  analytics: { tag: "Team Link", title: "Analytics", subtitle: "Espacio para que el equipo conecte rutas y componentes." },
  settings: { tag: "Control", title: "Settings", subtitle: "Preferencias de cuenta, seguridad y notificaciones." },
  products: { tag: "Team Link", title: "Products", subtitle: "Espacio para que el equipo conecte rutas y componentes." },
  orders: { tag: "Team Link", title: "Orders", subtitle: "Espacio para que el equipo conecte rutas y componentes." }
};

const defaultSettings = {
  username: "John",
  email: "example@gmail.com",
  language: "English",
  timeZone: "(GMT-5) Eastern Time",
  twoFactorEnabled: false,
  lastBackup: "",
  passwordMask: "********",
  notifications: {
    email: true,
    mobile: false,
    projects: true,
    daily: true
  }
};

const navButtons = Array.from(document.querySelectorAll(".nav-btn[data-section]"));
const panels = Array.from(document.querySelectorAll(".panel"));
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const sectionTag = document.getElementById("sectionTag");
const announcer = document.getElementById("announcer");
const statusMessage = document.getElementById("statusMessage");
const main = document.getElementById("contenido-principal");
const themeToggle = document.getElementById("themeToggle");
const themeQuickToggle = document.getElementById("themeQuickToggle");
const deleteAccount = document.getElementById("deleteAccount");
const closeAccount = document.getElementById("closeAccount");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const usernameValue = document.getElementById("usernameValue");
const emailValue = document.getElementById("emailValue");
const passwordValue = document.getElementById("passwordValue");
const languageValue = document.getElementById("languageValue");
const backupValue = document.getElementById("backupValue");
const twoFactorValue = document.getElementById("twoFactorValue");
const timezoneValue = document.getElementById("timezoneValue");

const editUsernameBtn = document.getElementById("editUsernameBtn");
const updateEmailBtn = document.getElementById("updateEmailBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changeLanguageBtn = document.getElementById("changeLanguageBtn");
const backupBtn = document.getElementById("backupBtn");
const exportBtn = document.getElementById("exportBtn");
const toggle2faBtn = document.getElementById("toggle2faBtn");
const changeTimezoneBtn = document.getElementById("changeTimezoneBtn");

const emailNotify = document.getElementById("emailNotify");
const mobileAlerts = document.getElementById("mobileAlerts");
const projectUpdates = document.getElementById("projectUpdates");
const dailySummary = document.getElementById("dailySummary");

let settingsState = loadSettings();

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(defaultSettings));
}

function loadSettings() {
  const raw = localStorage.getItem("clearPathSettings");
  if (!raw) {
    return cloneDefaultSettings();
  }
  try {
    const parsed = JSON.parse(raw);
    const merged = { ...cloneDefaultSettings(), ...parsed };
    merged.notifications = {
      ...defaultSettings.notifications,
      ...(parsed.notifications || {})
    };
    return merged;
  } catch {
    return cloneDefaultSettings();
  }
}

function saveSettings() {
  localStorage.setItem("clearPathSettings", JSON.stringify(settingsState));
}

function announce(message) {
  announcer.textContent = "";
  statusMessage.textContent = message;
  window.setTimeout(() => {
    announcer.textContent = message;
  }, 10);
}

function applySettingsToUI() {
  usernameValue.textContent = settingsState.username;
  emailValue.textContent = settingsState.email;
  passwordValue.textContent = settingsState.passwordMask;
  languageValue.textContent = settingsState.language;
  timezoneValue.textContent = settingsState.timeZone;
  backupValue.textContent = settingsState.lastBackup || "Ultimo respaldo: no disponible";
  twoFactorValue.textContent = settingsState.twoFactorEnabled
    ? "2FA activa para mayor seguridad"
    : "Aumenta la seguridad de inicio de sesion";
  toggle2faBtn.textContent = settingsState.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA";

  emailNotify.checked = Boolean(settingsState.notifications?.email);
  mobileAlerts.checked = Boolean(settingsState.notifications?.mobile);
  projectUpdates.checked = Boolean(settingsState.notifications?.projects);
  dailySummary.checked = Boolean(settingsState.notifications?.daily);
}

function showSection(sectionId, moveFocus = false) {
  const data = sectionMeta[sectionId];
  const targetPanel = document.getElementById(sectionId);
  if (!data || !targetPanel) {
    announce("Seccion no disponible.");
    return;
  }

  panels.forEach((panel) => {
    panel.hidden = panel.id !== sectionId;
  });

  navButtons.forEach((button) => {
    const isActive = button.dataset.section === sectionId;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  sectionTag.textContent = data.tag;
  pageTitle.textContent = data.title;
  pageSubtitle.textContent = data.subtitle;
  document.title = `Clear Path | ${data.title}`;
  if (moveFocus) {
    main.focus();
  }
  announce(`Vista cambiada a ${data.title}.`);
}

function syncTheme() {
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme || (prefersDark ? "dark" : "light");
  document.body.dataset.theme = theme;
  const darkMode = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(darkMode));
  themeToggle.textContent = darkMode ? "Modo claro" : "Modo oscuro";
}

function toggleTheme() {
  const current = document.body.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.body.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncTheme();
  announce(`Tema ${next === "dark" ? "oscuro" : "claro"} activado.`);
}

function promptValue(label, currentValue) {
  const value = window.prompt(label, currentValue);
  if (value === null) {
    return null;
  }
  const cleaned = value.trim();
  return cleaned || null;
}

function exportSettings() {
  const content = JSON.stringify(settingsState, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clear-path-settings.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markSaved(message) {
  saveSettings();
  applySettingsToUI();
  announce(message);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.section, true));
});

themeToggle.addEventListener("click", toggleTheme);
if (themeQuickToggle) {
  themeQuickToggle.addEventListener("click", toggleTheme);
}

saveSettingsBtn.addEventListener("click", () => {
  markSaved("Cambios guardados correctamente.");
});

editUsernameBtn.addEventListener("click", () => {
  const next = promptValue("Nuevo username", settingsState.username);
  if (!next) return;
  settingsState.username = next;
  markSaved("Username actualizado.");
});

updateEmailBtn.addEventListener("click", () => {
  const next = promptValue("Nuevo email", settingsState.email);
  if (!next) return;
  const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(next);
  if (!isValid) {
    announce("Email invalido. Usa formato usuario@dominio.com.");
    return;
  }
  settingsState.email = next;
  markSaved("Email actualizado.");
});

changePasswordBtn.addEventListener("click", () => {
  const pass = window.prompt("Nueva clave (minimo 8 caracteres)");
  if (pass === null) return;
  if (pass.trim().length < 8) {
    announce("La clave debe tener al menos 8 caracteres.");
    return;
  }
  settingsState.passwordMask = "********";
  markSaved("Clave actualizada.");
});

changeLanguageBtn.addEventListener("click", () => {
  const next = promptValue("Idioma (English o Espanol)", settingsState.language);
  if (!next) return;
  settingsState.language = next;
  markSaved("Idioma actualizado.");
});

backupBtn.addEventListener("click", () => {
  const timestamp = new Date().toLocaleString();
  settingsState.lastBackup = `Ultimo respaldo: ${timestamp}`;
  markSaved("Respaldo generado.");
});

exportBtn.addEventListener("click", () => {
  saveSettings();
  exportSettings();
  announce("Datos exportados en JSON.");
});

toggle2faBtn.addEventListener("click", () => {
  settingsState.twoFactorEnabled = !settingsState.twoFactorEnabled;
  markSaved(settingsState.twoFactorEnabled ? "2FA activada." : "2FA desactivada.");
});

changeTimezoneBtn.addEventListener("click", () => {
  const next = promptValue("Zona horaria", settingsState.timeZone);
  if (!next) return;
  settingsState.timeZone = next;
  markSaved("Zona horaria actualizada.");
});

emailNotify.addEventListener("change", () => {
  settingsState.notifications.email = emailNotify.checked;
  markSaved("Preferencias de notificaciones actualizadas.");
});

mobileAlerts.addEventListener("change", () => {
  settingsState.notifications.mobile = mobileAlerts.checked;
  markSaved("Preferencias de notificaciones actualizadas.");
});

projectUpdates.addEventListener("change", () => {
  settingsState.notifications.projects = projectUpdates.checked;
  markSaved("Preferencias de notificaciones actualizadas.");
});

dailySummary.addEventListener("change", () => {
  settingsState.notifications.daily = dailySummary.checked;
  markSaved("Preferencias de notificaciones actualizadas.");
});

deleteAccount.addEventListener("click", () => {
  const accepted = window.confirm("Vas a limpiar la configuracion local. Deseas continuar?");
  if (!accepted) {
    announce("Delete Account: accion cancelada.");
    return;
  }
  localStorage.removeItem("clearPathSettings");
  settingsState = cloneDefaultSettings();
  markSaved("Configuracion restablecida.");
});

closeAccount.addEventListener("click", () => {
  const accepted = window.confirm("Esta accion es sensible. Confirma que deseas continuar.");
  announce(accepted ? "Close Account: accion confirmada." : "Close Account: accion cancelada.");
});

window.addEventListener("keydown", (event) => {
  if (!event.altKey) return;
  const map = { "1": "dashboard", "2": "projects", "3": "reports", "4": "analytics", "5": "settings" };
  const sectionId = map[event.key];
  if (sectionId) {
    event.preventDefault();
    showSection(sectionId, true);
  }
});

syncTheme();
applySettingsToUI();
showSection("settings");
