import DashboardPage from "./page";
import { BarLoader } from "react-spinners";
import { Suspense } from "react";
// 1. Import the Voice Assistant Component we created
import VoiceAssistant from "./_components/ai-voice-assistant";
// Note: Ensure the path matches where you saved ai-voice-assistant.jsx

// --- NEW IMPORTS ---
import { db } from "@/lib/prisma"; // Make sure this path is correct for your Prisma client
import { currentUser } from "@clerk/nextjs/server"; // Import for authentication
import { redirect } from "next/navigation"; // For redirection if not logged in
// -------------------

export default async function Layout() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // --- DATA FETCHING ZONE ---
  const loggedInUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
  });

  let transactions = []; // Overwrite the placeholder array
  let accounts = []; // Overwrite the placeholder array

  if (loggedInUser) {
    // 1. Fetch Transactions and Accounts using the database user ID
    const fetchedTransactions = await db.transaction.findMany({
      where: { userId: loggedInUser.id },
      orderBy: { date: "desc" },
      take: 40, // Limit context size for performance
      // No need to include account here, as we fetch accounts separately, 
      // but it doesn't hurt if your layout needs it.
    });

    const fetchedAccounts = await db.account.findMany({
      where: { userId: loggedInUser.id },
    });

    // 2. Convert Prisma "Decimal" and "Date" to safe types for serialization
    
    // FIX: Ensure ALL decimal fields are converted, especially 'amount'
    transactions = fetchedTransactions.map((t) => ({
      ...t,
      amount: t.amount.toNumber(), // <--- THIS IS THE FIX
      date: t.date.toISOString(), // Convert Date object to String
      // If any other field in Transaction is a Decimal (like receipt amount), 
      // it must also be converted with .toNumber()
    }));

    accounts = fetchedAccounts.map((a) => ({
      ...a,
      balance: a.balance.toNumber(), // This conversion was already correct
    }));
  }
  // --------------------------

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold tracking-tight gradient-title">
          Dashboard
        </h1>
      </div>
      
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <DashboardPage />
      </Suspense>

      {/* 2. Add the AI Assistant at the bottom */}
      {/* We pass the data into it so the AI works */}
      <VoiceAssistant transactions={transactions} accounts={accounts} />
    </div>
  );
}