"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { nextSaleNo, nextStationaryReceiptNo } from "@/lib/ids";

export async function createItemAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);

  if (!name || price <= 0) {
    return { error: "Item name and a valid price are required" };
  }

  await prisma.stationaryItem.create({ data: { name, price } });

  revalidatePath("/stationary/items");
  redirect("/stationary/items");
}

export async function updateItemAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const status = String(formData.get("status") || "ACTIVE");

  if (!name || price <= 0) {
    return { error: "Item name and a valid price are required" };
  }

  await prisma.stationaryItem.update({ where: { id }, data: { name, price, status } });

  revalidatePath("/stationary/items");
  redirect("/stationary/items");
}

export async function deleteItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.stationaryItem.delete({ where: { id } });
  revalidatePath("/stationary/items");
}

function readSaleItems(formData: FormData) {
  const itemIds = formData.getAll("itemId").map(String);
  const itemNames = formData.getAll("itemName").map(String);
  const itemPrices = formData.getAll("itemPrice").map(Number);
  const itemQtys = formData.getAll("itemQty").map(Number);

  return itemIds
    .map((itemId, i) => ({
      itemId,
      itemName: itemNames[i],
      price: itemPrices[i] || 0,
      quantity: itemQtys[i] || 0,
      amount: (itemPrices[i] || 0) * (itemQtys[i] || 0),
    }))
    .filter((item) => item.quantity > 0);
}

export async function createSaleAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const studentId = String(formData.get("studentId") || "");
  const paymentMode = String(formData.get("paymentMode") || "CASH");
  const amountReceivedRaw = String(formData.get("paidAmount") || "").trim();

  if (!studentId) {
    return { error: "Please select a student" };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found" };

  const items = readSaleItems(formData);
  if (items.length === 0) {
    return { error: "Select at least one item with a quantity" };
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const amountReceived =
    amountReceivedRaw === "" ? totalAmount : Math.max(0, Number(amountReceivedRaw));
  const saleNo = await nextSaleNo();

  const sale = await prisma.stationarySale.create({
    data: {
      saleNo,
      studentId,
      paymentMode,
      totalAmount,
      items: { create: items },
      ...(amountReceived > 0
        ? {
            payments: {
              create: {
                receiptNo: await nextStationaryReceiptNo(),
                amount: amountReceived,
                mode: paymentMode,
                remarks: "Received at time of sale",
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/stationary/sales");
  redirect(`/stationary/sales?sale=${sale.id}`);
}

export async function updateSaleAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id") || "");
  const paymentMode = String(formData.get("paymentMode") || "CASH");

  const items = readSaleItems(formData);
  if (items.length === 0) {
    return { error: "Select at least one item with a quantity" };
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  await prisma.$transaction([
    prisma.stationarySaleItem.deleteMany({ where: { saleId: id } }),
    prisma.stationarySale.update({
      where: { id },
      data: {
        paymentMode,
        totalAmount,
        items: { create: items },
      },
    }),
  ]);

  revalidatePath("/stationary/sales");
  revalidatePath(`/stationary/sales/${id}`);
  redirect(`/stationary/sales/${id}`);
}

export async function deleteSaleAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.stationarySale.delete({ where: { id } });
  revalidatePath("/stationary/sales");
}

export async function recordStationaryPaymentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const saleId = String(formData.get("saleId") || "");
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "CASH");
  const remarks = String(formData.get("remarks") || "").trim();
  const paymentDate = formData.get("paymentDate")
    ? new Date(String(formData.get("paymentDate")))
    : new Date();

  if (!saleId || !amount || amount <= 0) {
    return { error: "Please enter a valid payment amount" };
  }

  const sale = await prisma.stationarySale.findUnique({ where: { id: saleId } });
  if (!sale) return { error: "Sale not found" };

  const receiptNo = await nextStationaryReceiptNo();

  const payment = await prisma.stationarySalePayment.create({
    data: { receiptNo, saleId, amount, mode, remarks, paymentDate },
  });

  revalidatePath("/stationary/sales");
  revalidatePath("/stationary/payments");
  revalidatePath("/stationary/pending");
  redirect(`/stationary-payment-receipt/${payment.id}`);
}

export async function updateStationaryPaymentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "CASH");
  const remarks = String(formData.get("remarks") || "").trim();
  const paymentDate = formData.get("paymentDate")
    ? new Date(String(formData.get("paymentDate")))
    : new Date();

  if (!amount || amount <= 0) {
    return { error: "Please enter a valid payment amount" };
  }

  await prisma.stationarySalePayment.update({
    where: { id },
    data: { amount, mode, remarks, paymentDate },
  });

  revalidatePath("/stationary/sales");
  revalidatePath("/stationary/payments");
  revalidatePath("/stationary/pending");
  redirect("/stationary/payments");
}

export async function deleteStationaryPaymentAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.stationarySalePayment.delete({ where: { id } });
  revalidatePath("/stationary/sales");
  revalidatePath("/stationary/payments");
  revalidatePath("/stationary/pending");
}
