import { NextResponse } from "next/server";

const SUPABASE_URL = "https://api.spokum.ru";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5NDkxODA3LCJleHAiOjIxMDQ4NTE4MDd9.uJJYonJG9-MhdtckwhXyQTGoeNWeToDvocmGzwd8rc0";

async function fetchCount(table: string, filter?: string) {
  const url = filter
    ? `${SUPABASE_URL}/rest/v1/${table}?select=id&${filter}`
    : `${SUPABASE_URL}/rest/v1/${table}?select=id`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    },
  });
  const range = res.headers.get("content-range") || "*/0";
  const total = range.split("/")[1];
  return Number(total) || 0;
}

async function fetchAll<T>(table: string, select: string, filter?: string) {
  const url = filter
    ? `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filter}`
    : `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return (await res.json()) as T[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("pwd");

  if (password !== "3456") {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 403 });
  }

  try {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    // Today's date at 00:00 UTC — for counting registrations since midnight
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartStr = todayStart.toISOString();
    // 30 days ago — for monthly summary
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsers,
      onlineNow,
      dailyActive,
      newToday,
      totalPosts,
      totalGifts,
      totalMessages,
      coinsData,
      moodsData,
      giftsData,
      monthNewUsersCount,
      monthPostsTotal,
      monthGiftsTotal,
      monthLikesTotal,
      monthNewUsersRaw,
      monthPostsRaw,
    ] = await Promise.all([
      fetchCount("profiles"),
      fetchCount("profiles", `last_seen=gte.${fiveMinAgo}`),
      fetchCount("profiles", `last_seen=gte.${dayAgo}`),
      fetchCount("profiles", `created_at=gte.${todayStartStr}`),
      fetchCount("posts", "removed=eq.false"),
      fetchCount("gifts", "sold=eq.false"),
      fetchCount("messages"),
      fetchAll<{ coins: number }>("profiles", "coins"),
      fetchAll<{ mood: string }>("profiles", "mood"),
      fetchAll<{ price: number }>("gifts", "price"),
      // Monthly stats
      fetchCount("profiles", `created_at=gte.${monthAgo}`),
      fetchCount("posts", `created_at=gte.${monthAgo}`),
      fetchCount("gifts", `created_at=gte.${monthAgo}`),
      fetchCount("likes", `created_at=gte.${monthAgo}`),
      fetchAll<{ created_at: string }>("profiles", "created_at", `created_at=gte.${monthAgo}`),
      fetchAll<{ created_at: string }>("posts", "created_at", `created_at=gte.${monthAgo}`),
    ]);

    // Assign monthly stats
    const monthNewUsersData = monthNewUsersRaw;
    const monthPostsData = monthPostsRaw;

    // Week activity (7 days)
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().slice(0, 10);
      const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const [active, newUsers] = await Promise.all([
        fetchCount("profiles", `last_seen=gte.${dayStr}T00:00:00&last_seen=lt.${nextDay}T00:00:00`),
        fetchCount("profiles", `created_at=gte.${dayStr}T00:00:00&created_at=lt.${nextDay}T00:00:00`),
      ]);
      weekData.push({
        date: dayStr,
        label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }),
        active,
        newUsers,
      });
    }

    const totalCoins = (Array.isArray(coinsData) ? coinsData : []).reduce((sum, u) => sum + (u.coins || 0), 0);
    const totalGiftsRevenue = (Array.isArray(giftsData) ? giftsData : []).reduce((sum, g) => sum + (g.price || 0), 0);

    // Monthly summary: group by day
    const monthNewUsersArr = (Array.isArray(monthNewUsersData) ? monthNewUsersData : []);
    const monthPostsArr = (Array.isArray(monthPostsData) ? monthPostsData : []);

    const monthLabels: Record<string, number> = {};
    const monthPostsByDay: Record<string, number> = {};
    monthNewUsersArr.forEach((u) => {
      const day = (u.created_at || "").slice(0, 10);
      if (day) monthLabels[day] = (monthLabels[day] || 0) + 1;
    });
    monthPostsArr.forEach((p) => {
      const day = (p.created_at || "").slice(0, 10);
      if (day) monthPostsByDay[day] = (monthPostsByDay[day] || 0) + 1;
    });

    // Build 30-day chart data
    const monthChart = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().slice(0, 10);
      monthChart.push({
        date: dayStr,
        label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        newUsers: monthLabels[dayStr] || 0,
        posts: monthPostsByDay[dayStr] || 0,
      });
    }

    const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    const moodCounts: Record<string, number> = {};
    (Array.isArray(moodsData) ? moodsData : []).forEach((u) => {
      const m = u.mood || "calm";
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    });

    const moodLabels: Record<string, string> = {
      calm: "Спокойствие", joy: "Радость", sad: "Грусть", anger: "Злость",
      anxiety: "Тревога", tired: "Усталость", tender: "Нежность", lift: "Подъём",
      love: "Любовь", inspired: "Вдохновение",
    };
    const moodColors: Record<string, string> = {
      calm: "#87b7a3", joy: "#e8c46a", sad: "#7fa8e8", anger: "#e87a5a",
      anxiety: "#d8a8e8", tired: "#a8a8b8", tender: "#f0a8c8", lift: "#5ae8a8",
      love: "#e8588a", inspired: "#c8a8e8",
    };

    const moods = Object.entries(moodCounts)
      .map(([key, count]) => ({
        key, label: moodLabels[key] || key, count,
        color: moodColors[key] || "#888",
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      stats: {
        totalUsers, onlineNow, dailyActive, newToday,
        totalPosts, totalGifts, totalMessages,
        totalCoins, totalGiftsRevenue,
      },
      monthly: {
        monthName,
        newUsers: monthNewUsersCount,
        posts: monthPostsTotal,
        gifts: monthGiftsTotal,
        likes: monthLikesTotal,
        chart: monthChart,
      },
      moods,
      weekData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Ошибка получения данных" },
      { status: 500 }
    );
  }
}
