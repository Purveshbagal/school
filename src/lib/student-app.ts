import "server-only";
import { prisma } from "@/lib/db";
import type { AppStudent } from "@/lib/student-auth";
import { getTrackingFeed } from "@/lib/tracking-server";
import { notifyTrackingChanged } from "@/lib/tracking-events";
import { placeAt, type BusPlace } from "@/lib/place-lookup";
import { dayBounds, dayKey, type TrackingFeed } from "@/lib/tracking";
import { getExamFeeGateThreshold, checkFeePaymentGate, getStudentFeeSummary } from "@/lib/fees";
import { sameAcademicYear } from "@/lib/academic-year";
import { computeStudentExamResult } from "@/lib/results";

// Data behind the Flutter student app's screens (see src/app/api/student/*).

// Last known place per trip, shown while the bus's new position is still being looked up
// (otherwise the name would blank out every time the bus enters a new ~110 m cell).
const globalForTripPlaces = globalThis as unknown as { tripPlaces?: Map<string, BusPlace> };
const lastTripPlace = (globalForTripPlaces.tripPlaces ??= new Map());

const maskAadhar = (aadhar: string | null) => {
  const digits = (aadhar ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : null;
};

/** Who's logged in, for the profile screen and the app header. */
export async function studentProfile(student: AppStudent) {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const village = student.villageRef;
  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNo: student.admissionNo,
      aadhar: maskAadhar(student.aadharNumber),
      fatherName: student.fatherName,
      motherName: student.motherName,
      gender: student.gender,
      dob: student.dob ? dayKey(student.dob) : null,
      phone: student.phone,
      address: student.address,
      village: village?.name ?? student.village,
      taluka: village?.taluka.name ?? student.taluka,
      district: village?.taluka.district.name ?? student.district,
      standard: { id: student.standard.id, name: student.standard.name },
      board: student.board,
      medium: student.medium,
      academicYear: student.academicYear,
      admissionDate: dayKey(student.admissionDate),
      schoolBus: student.schoolBus,
      pickup: student.pickupLat == null || student.pickupLng == null ? null : {
        lat: student.pickupLat, lng: student.pickupLng, address: student.pickupAddress,
      },
      // Passport-size JPEG data URL from the admission form (small; the app decodes it).
      photo: student.photoUrl || null,
    },
    school: {
      name: settings?.name ?? "School",
      address: settings?.address ?? null,
      phone: settings?.phone ?? null,
      academicYear: settings?.academicYear ?? null,
    },
  };
}

/** The student's admission village. Older records may only have the village typed as text. */
async function studentVillage(student: AppStudent): Promise<{ id: string | null; name: string | null }> {
  if (student.villageRef) return { id: student.villageRef.id, name: student.villageRef.name };
  const name = student.village?.trim();
  if (!name) return { id: null, name: null };
  const matches = await prisma.village.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 2,
  });
  return matches.length === 1 ? matches[0] : { id: null, name };
}

export type StudentBus = {
  driverId: string;
  driverName: string;
  driverPhone: string | null;
  vehicleNumber: string | null;
};

export type StudentBusFeed = TrackingFeed & {
  /** Buses (drivers) whose route covers the student's village — live or not. */
  buses: StudentBus[];
  /** Area / village of each live trip's latest position, by trip id. */
  places: Record<string, BusPlace | null>;
  village: string | null;
  assignedBus: boolean;
};

/**
 * The live feed limited to the student's own bus: drivers assigned (Live Tracking →
 * Assign Driver → villages) to the student's admission village.
 */
export async function studentBusFeed(student: AppStudent, since: number | null): Promise<StudentBusFeed> {
  const village = await studentVillage(student);
  const drivers = student.assignedDriverId || village.id
    ? await prisma.busDriver.findMany({
        where: { status: "ACTIVE", ...(student.assignedDriverId
          ? { id: student.assignedDriverId }
          : { villageIds: { has: village.id! } }) },
        include: { bus: { select: { vehicleNumber: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  const feed = await getTrackingFeed(
    since,
    drivers.map((d) => d.id)
  );

  const places: Record<string, BusPlace | null> = {};
  for (const trip of feed.trips) {
    if (trip.lastLat == null || trip.lastLng == null) continue;
    const place = placeAt(trip.lastLat, trip.lastLng, () => notifyTrackingChanged(trip.driverId));
    if (place) lastTripPlace.set(trip.id, place);
    places[trip.id] = place ?? lastTripPlace.get(trip.id) ?? null;
  }
  if (lastTripPlace.size > 500) {
    const live = new Set(feed.trips.map((t) => t.id));
    for (const id of lastTripPlace.keys()) if (!live.has(id) && lastTripPlace.size > 250) lastTripPlace.delete(id);
  }

  return {
    ...feed,
    buses: drivers.map((d) => ({
      driverId: d.id,
      driverName: d.name,
      driverPhone: d.phone,
      vehicleNumber: d.bus?.vehicleNumber ?? null,
    })),
    places,
    village: village.name,
    assignedBus: Boolean(student.assignedDriverId),
  };
}

/** Driver ids a student may see — used to check a trip before estimating its arrival. */
export async function studentDriverIds(student: AppStudent): Promise<string[]> {
  const village = await studentVillage(student);
  if (!student.assignedDriverId && !village.id) return [];
  const drivers = await prisma.busDriver.findMany({
    where: { status: "ACTIVE", ...(student.assignedDriverId
      ? { id: student.assignedDriverId }
      : { villageIds: { has: village.id! } }) },
    select: { id: true },
  });
  return drivers.map((d) => d.id);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The student's standard's exam timetable: upcoming papers, plus the last month's for reference. */
export async function studentExams(student: AppStudent) {
  const today = dayKey(Date.now());
  const todayStart = dayBounds(today)!.start;
  const rows = await prisma.examSchedule.findMany({
    where: { standardId: student.standardId, date: { gte: new Date(todayStart.getTime() - 30 * DAY_MS) } },
    include: { exam: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  type Paper = { id: string; subject: string | null; day: string; startTime: string | null; endTime: string | null };
  const byExam = new Map<string, { examId: string; examName: string; papers: Paper[] }>();
  for (const row of rows) {
    const group = byExam.get(row.examId) ?? { examId: row.examId, examName: row.exam.name, papers: [] };
    group.papers.push({
      id: row.id,
      subject: row.subject,
      day: dayKey(row.date),
      startTime: row.startTime,
      endTime: row.endTime,
    });
    byExam.set(row.examId, group);
  }

  const exams = [...byExam.values()].map((g) => ({
    ...g,
    from: g.papers[0].day,
    to: g.papers[g.papers.length - 1].day,
  }));
  return {
    today,
    upcoming: exams.filter((e) => e.to >= today),
    recent: exams.filter((e) => e.to < today).reverse(),
  };
}

/** Notice Board posts for everyone or for the student's standard, newest first. */
export async function studentNotices(student: AppStudent) {
  const notices = await prisma.notice.findMany({
    where: { OR: [{ standardIds: { isEmpty: true } }, { standardIds: { has: student.standardId } }] },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt.getTime(),
    })),
  };
}

/**
 * Results the school has published (Set Exam → result link active), with the same
 * fee rule as the public result page: a gated exam stays locked until enough is paid.
 */
export async function studentResults(student: AppStudent) {
  const exams = await prisma.exam.findMany({
    where: { resultLinkActive: true, isFinal: false },
    orderBy: { examDate: "desc" },
  });

  const results = [];
  for (const exam of exams) {
    const threshold = getExamFeeGateThreshold(exam.name);
    if (threshold !== null) {
      const { passed, paidPct } = await checkFeePaymentGate(student.id, threshold);
      if (!passed) {
        const hasMarks = await prisma.marks.count({ where: { studentId: student.id, examId: exam.id } });
        if (!hasMarks) continue;
        results.push({
          examId: exam.id,
          examName: exam.name,
          locked: true,
          message: `Pay at least ${Math.round(threshold * 100)}% of the fees to see this result (${Math.round(paidPct * 100)}% paid).`,
        });
        continue;
      }
    }
    const result = await computeStudentExamResult(student, exam);
    if (!result) continue;
    results.push({
      examId: exam.id,
      examName: exam.name,
      locked: false,
      resultDate: dayKey(result.resultDate),
      rows: result.rows,
      totalObtained: result.totalObtained,
      totalMax: result.totalMax,
      percentage: Math.round(result.percentage * 100) / 100,
      rank: result.rank,
      totalStudents: result.totalStudents,
    });
  }
  return { results };
}

/** This year's fees and the receipts paid against them. */
export async function studentFees(student: AppStudent) {
  const summary = await getStudentFeeSummary(student.id);
  if (!summary) return null;
  return {
    academicYear: student.academicYear,
    standardFee: summary.standardFee,
    busFee: summary.busFee,
    openingBalance: summary.openingBalance,
    totalFee: summary.totalFee,
    totalPaid: summary.totalPaid,
    due: summary.due,
    advance: summary.advance,
    payments: summary.student.payments
      .filter((p) => sameAcademicYear(p.academicYear, student.academicYear))
      .map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: p.amount,
        day: dayKey(p.paymentDate),
        mode: p.mode,
        remarks: p.remarks,
      })),
  };
}
