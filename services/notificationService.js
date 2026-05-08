import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import scheduleNotificationAsync from "expo-notifications/build/scheduleNotificationAsync";
import cancelScheduledNotificationAsync from "expo-notifications/build/cancelScheduledNotificationAsync";
import getAllScheduledNotificationsAsync from "expo-notifications/build/getAllScheduledNotificationsAsync";
import { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import setNotificationChannelAsync from "expo-notifications/build/setNotificationChannelAsync.android";
import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";

const STORAGE_KEY = "@session_notification_ids";
const WEEKDAY_MAP = {
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
  Saturday: 7,
};

setNotificationHandler({
  handleNotification: async () => ({
    // Local notifications in foreground.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function parseTimeToHourMinute(rawTime) {
  if (!rawTime || typeof rawTime !== "string") return null;

  const normalized = rawTime.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "AM") hour = hour === 12 ? 0 : hour;
    if (period === "PM") hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function formatReadableTime(rawTime) {
  const parsed = parseTimeToHourMinute(rawTime);
  if (!parsed) return rawTime || "scheduled time";
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getNextClassDate(day, fromTime) {
  const time = parseTimeToHourMinute(fromTime);
  const weekday = WEEKDAY_MAP[day];
  if (!time || !weekday) return null;

  const now = new Date();
  const next = new Date(now);
  const jsTargetDay = weekday % 7; // JS Date: Sunday=0 ... Saturday=6
  const currentDay = now.getDay();
  let daysUntil = jsTargetDay - currentDay;

  if (daysUntil < 0) daysUntil += 7;
  next.setDate(now.getDate() + daysUntil);
  next.setHours(time.hour, time.minute, 0, 0);

  // If today's class already started/passed, next occurrence is next week.
  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }

  return next;
}

function getNextReminderDate(day, fromTime, minutesBefore) {
  const classDate = getNextClassDate(day, fromTime);
  if (!classDate) return null;
  const reminder = new Date(classDate.getTime() - minutesBefore * 60 * 1000);
  return reminder > new Date() ? reminder : null;
}

async function getScheduledIdSet() {
  try {
    const scheduled = await getAllScheduledNotificationsAsync();
    return new Set(scheduled.map((item) => item.identifier));
  } catch (error) {
    console.warn("Failed to inspect scheduled notifications:", error);
    return new Set();
  }
}

async function cleanupOrphanedSessionNotifications(storedMap) {
  try {
    const scheduled = await getAllScheduledNotificationsAsync();
    const keepIds = new Set();

    Object.values(storedMap || {}).forEach((entry) => {
      if (entry?.before30) keepIds.add(entry.before30);
      if (entry?.before5) keepIds.add(entry.before5);
    });

    for (const item of scheduled) {
      const classId = item?.content?.data?.classId;
      if (!classId) continue;
      if (!keepIds.has(item.identifier)) {
        await cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    console.warn("Failed to cleanup orphaned session notifications:", error);
  }
}

function hasStoredIdsForReminder(existing, enableFiveMinuteReminder, scheduledIdSet) {
  if (!existing?.before30 || !scheduledIdSet.has(existing.before30)) {
    return false;
  }
  if (enableFiveMinuteReminder) {
    return Boolean(existing.before5 && scheduledIdSet.has(existing.before5));
  }
  return !existing.before5;
}

async function readStoredNotifications() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.warn("Failed to read stored notification IDs:", error);
    return {};
  }
}

async function writeStoredNotifications(value) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save notification IDs:", error);
  }
}

export async function requestNotificationPermissions() {
  try {
    const existing = await getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== "granted") {
      // Local notifications only for Expo Go compatibility.
      const requested = await requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.warn("Notifications permission not granted");
      return false;
    }

    if (Platform.OS === "android") {
      await setNotificationChannelAsync("session-reminders", {
        name: "Session Reminders",
        importance: AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return true;
  } catch (error) {
    console.warn("Failed to request notification permissions:", error);
    return false;
  }
}

async function scheduleReminder({
  className,
  day,
  fromTime,
  minutesBefore,
  classId,
}) {
  const time = parseTimeToHourMinute(fromTime);
  const weekday = WEEKDAY_MAP[day];
  if (!time || !weekday) return null;
  if (!getNextReminderDate(day, fromTime, minutesBefore)) return null;

  let triggerMinute = time.minute - minutesBefore;
  let triggerHour = time.hour;
  let triggerWeekday = weekday;

  while (triggerMinute < 0) {
    triggerMinute += 60;
    triggerHour -= 1;
  }

  while (triggerHour < 0) {
    triggerHour += 24;
    triggerWeekday = triggerWeekday === 1 ? 7 : triggerWeekday - 1;
  }

  const title = "Upcoming Session";
  const body = `Your session starts at ${formatReadableTime(fromTime)}${className ? ` (${className})` : ""}`;

  return scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: {
        classId,
        className: className || "",
        day,
        fromTime,
        minutesBefore,
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      channelId: Platform.OS === "android" ? "session-reminders" : undefined,
      weekday: triggerWeekday,
      hour: triggerHour,
      minute: triggerMinute,
      repeats: true,
    },
  });
}

export async function cancelSessionNotifications(sessionId) {
  if (!sessionId) return;

  try {
    const map = await readStoredNotifications();
    const ids = map[sessionId];
    if (ids?.before30) await cancelScheduledNotificationAsync(ids.before30);
    if (ids?.before5) await cancelScheduledNotificationAsync(ids.before5);
    delete map[sessionId];
    await writeStoredNotifications(map);
  } catch (error) {
    console.warn(`Failed to cancel notifications for session ${sessionId}:`, error);
  }
}

export async function scheduleSessionNotifications({
  sessionId,
  classId,
  className,
  day,
  fromTime,
  enableFiveMinuteReminder = true,
}) {
  if (!sessionId) {
    throw new Error("sessionId is required to schedule notifications");
  }

  if (!day || !fromTime) {
    console.warn("Skipping notification scheduling: missing day/fromTime");
    return null;
  }
  if (!parseTimeToHourMinute(fromTime) || !WEEKDAY_MAP[day]) {
    console.warn("Skipping notification scheduling: invalid day/fromTime format");
    return null;
  }
  if (!getNextReminderDate(day, fromTime, 30)) {
    console.warn("Skipping notification scheduling: reminder time already passed");
    return null;
  }

  try {
    await cancelSessionNotifications(sessionId);

    const before30 = await scheduleReminder({
      className,
      day,
      fromTime,
      minutesBefore: 30,
      classId,
    });

    const before5 = enableFiveMinuteReminder
      ? await scheduleReminder({
          className,
          day,
          fromTime,
          minutesBefore: 5,
          classId,
        })
      : null;

    const map = await readStoredNotifications();
    map[sessionId] = {
      before30: before30 || null,
      before5: before5 || null,
      classId: classId || null,
      className: className || "",
      day,
      fromTime,
      updatedAt: new Date().toISOString(),
    };
    await writeStoredNotifications(map);

    return map[sessionId];
  } catch (error) {
    console.warn(`Failed to schedule notifications for session ${sessionId}:`, error);
    return null;
  }
}

export async function syncSessionNotifications(sessionList = [], options = {}) {
  const { enableFiveMinuteReminder = true } = options;
  try {
    const currentIds = new Set(sessionList.map((session) => session.id));
    const map = await readStoredNotifications();
    await cleanupOrphanedSessionNotifications(map);
    const scheduledIdSet = await getScheduledIdSet();

    // Cancel stale reminders for sessions that no longer exist.
    for (const sessionId of Object.keys(map)) {
      if (!currentIds.has(sessionId)) {
        await cancelSessionNotifications(sessionId);
      }
    }

    // Ensure every current session has reminders aligned with latest schedule.
    for (const session of sessionList) {
      if (!session?.id || !session?.day || !session?.fromTime) continue;
      if (!parseTimeToHourMinute(session.fromTime) || !WEEKDAY_MAP[session.day]) continue;
      if (!getNextReminderDate(session.day, session.fromTime, 30)) continue;
      const existing = map[session.id];
      const hasValidIds = hasStoredIdsForReminder(existing, enableFiveMinuteReminder, scheduledIdSet);
      const changed =
        !existing ||
        existing.day !== session.day ||
        existing.fromTime !== session.fromTime ||
        existing.className !== (session.name || "") ||
        Boolean(existing.before5) !== Boolean(enableFiveMinuteReminder) ||
        !hasValidIds;

      if (changed) {
        await scheduleSessionNotifications({
          sessionId: session.id,
          classId: session.id,
          className: session.name || "",
          day: session.day,
          fromTime: session.fromTime,
          enableFiveMinuteReminder,
        });
      }
    }
  } catch (error) {
    console.warn("Failed to sync session notifications:", error);
  }
}

