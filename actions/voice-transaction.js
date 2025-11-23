"use server";

import { db } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createVoiceTransaction(data) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("User not found");

    // 1. Find the User in DB
    const dbUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) throw new Error("Database user not found");

    // 2. Find the Default Account (or the first one if no default)
    const account = await db.account.findFirst({
      where: { 
        userId: dbUser.id,
        isDefault: true 
      },
    }) || await db.account.findFirst({
        where: { userId: dbUser.id }
    });

    if (!account) throw new Error("No account found. Please create an account first.");

    // 3. Determine Type (Default to EXPENSE if not specified)
    const type = data.type?.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";
    const amount = parseFloat(data.amount);

    // 4. Create the Transaction
    await db.transaction.create({
      data: {
        userId: dbUser.id,
        accountId: account.id,
        amount: amount,
        date: new Date(),
        description: data.description || data.category,
        category: data.category || "Uncategorized",
        type: type,
        status: "COMPLETED",
      },
    });

    // 5. Update Account Balance
    const balanceChange = type === "EXPENSE" ? -amount : amount;
    const newBalance = parseFloat(account.balance) + balanceChange;

    await db.account.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });

    // 6. Refresh Dashboard
    revalidatePath("/dashboard");

    return { success: true, message: `Added ${type.toLowerCase()} of ${amount}` };

  } catch (error) {
    console.error("Voice Transaction Error:", error);
    return { success: false, error: error.message };
  }
}