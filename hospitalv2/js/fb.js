// js/fb.js  (ES module)
// ---- Firebase App + Firestore (CDN ESM) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore,
  collection, doc,
  getDoc, getDocs, addDoc, setDoc,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

/* ============================
   🔑 Firebase Web App Config
   Replace the placeholders below with your real config from:
   Firebase Console → Project Settings → Your apps → SDK setup & config
============================= */
const firebaseConfig = {
  apiKey:        "PASTE_ME",
  authDomain:    "PASTE_ME.firebaseapp.com",
  projectId:     "PASTE_ME",
  storageBucket: "PASTE_ME.appspot.com",
  messagingSenderId: "PASTE_ME",
  appId:         "PASTE_ME"
};

// Init
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Small helpers
const iso = (d) => new Date(d).toISOString().slice(0, 10);

// ============================
//           DB API
// ============================
export const DB = {
  /* ---------- Invoices (Pharmacy) ---------- */

  /**
   * Save an invoice with embedded items.
   * inv: {
   *   invoice_no, invoice_date:'YYYY-MM-DD',
   *   patient_name, patient_phone, doctor_name,
   *   discount_pct, discount_rs, total_rs, paid_rs, balance_rs,
   *   items: [{ item_name, qty, price_rs, amount_rs }]
   * }
   * @returns {Promise<string>} new document id
   */
  async saveInvoice(inv) {
    const clean = {
      invoice_no:   inv.invoice_no ?? "",
      invoice_date: inv.invoice_date ?? iso(new Date()),
      patient_name: inv.patient_name ?? "",
      patient_phone:inv.patient_phone ?? "",
      doctor_name:  inv.doctor_name ?? "",
      discount_pct: Number(inv.discount_pct ?? 0),
      discount_rs:  Number(inv.discount_rs  ?? 0),
      total_rs:     Number(inv.total_rs     ?? 0),
      paid_rs:      Number(inv.paid_rs      ?? 0),
      balance_rs:   Number(inv.balance_rs   ?? 0),
      items: (inv.items || []).map(x => ({
        item_name: String(x.item_name ?? x.name ?? ""),
        qty:       Number(x.qty ?? 0),
        price_rs:  Number(x.price_rs ?? x.price ?? 0),
        amount_rs: Number(x.amount_rs ?? (Number(x.qty ?? 0) * Number(x.price_rs ?? x.price ?? 0)))
      })),
      created_at: new Date().toISOString()
    };
    const ref = await addDoc(collection(db, "invoices"), clean);
    return ref.id;
  },

  /**
   * List invoices between two dates (inclusive).
   * Store invoice_date as "YYYY-MM-DD" string to make these queries work.
   */
  async listInvoicesBetween(fromISO, toISO) {
    const qy = query(
      collection(db, "invoices"),
      where("invoice_date", ">=", fromISO),
      where("invoice_date", "<=", toISO),
      orderBy("invoice_date", "asc")
    );
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /* ---------- Staff & Attendance ---------- */

  /** Get all staff */
  async listStaff() {
    const snap = await getDocs(collection(db, "staff"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Upsert a single attendance mark for a given staff + day.
   * att: { staff_id, day:'YYYY-MM-DD', name, role, status:'On Duty'|'On Leave'|'Absent', note }
   * Uses deterministic doc id: `${staff_id}_${day}`
   */
  async upsertAttendance(att) {
    const id = `${att.staff_id}_${att.day}`;
    const data = {
      staff_id: att.staff_id,
      day:      att.day,
      name:     att.name ?? "",
      role:     att.role ?? "Staff",
      status:   att.status ?? "On Duty",
      note:     att.note ?? "",
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, "staff_attendance", id), data, { merge: true });
    return id;
  },

  /** List attendance entries for a specific day */
  async listAttendanceByDay(dayISO) {
    const qy = query(collection(db, "staff_attendance"), where("day", "==", dayISO));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /* ---------- Patients (read-only for Doctor UI) ---------- */

  /** Basic: list all patients */
  async listPatients() {
    const snap = await getDocs(collection(db, "patients"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Optional: Patients with latest note/next visit
   * Requires a `patient_notes` collection with fields:
   * { patient_id, visit_date, next_visit, notes, created_at }
   */
  async listPatientsWithLatestNote() {
    // Fetch all patients
    const pSnap = await getDocs(collection(db, "patients"));
    const patients = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch notes ordered by created_at desc (so first occurrence per patient is latest)
    const nSnap = await getDocs(query(collection(db, "patient_notes"), orderBy("created_at", "desc")));
    const latestByPid = {};
    nSnap.docs.forEach(d => {
      const row = d.data();
      if (!latestByPid[row.patient_id]) latestByPid[row.patient_id] = row;
    });

    return patients.map(p => {
      const ln = latestByPid[p.id] || {};
      return {
        id: p.id,
        name: p.name || "—",
        phone: p.phone || "",
        last_visit: ln.visit_date || null,
        next_visit: ln.next_visit || null,
        notes: ln.notes || ""
      };
    });
  },

  /* ---------- Bookings (tokens) ---------- */

  /**
   * Create a booking/token.
   * b: { patient_name, patient_phone, booking_date:'YYYY-MM-DD', slot_time:'HH:MM', status:'pending'|'checked_in'|'done'|'cancelled' }
   */
  async createBooking(b) {
    const clean = {
      patient_name:  b.patient_name ?? "",
      patient_phone: b.patient_phone ?? "",
      booking_date:  b.booking_date ?? iso(new Date()),
      slot_time:     b.slot_time ?? "09:00",
      status:        b.status ?? "pending",
      created_at:    new Date().toISOString()
    };
    const ref = await addDoc(collection(db, "bookings"), clean);
    return ref.id;
  },

  /** List bookings for a given day, ordered by time */
  async listBookingsByDate(dayISO) {
    const qy = query(
      collection(db, "bookings"),
      where("booking_date", "==", dayISO),
      orderBy("slot_time", "asc")
    );
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

// Also attach to window for inline scripts
// (so you can call DB.* from <script type="module"> on your pages)
window.DB = DB;
