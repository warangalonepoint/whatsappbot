<!-- js/fb.js -->
<script type="module">
// Firebase SDKs (browser CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, addDoc, setDoc,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// TODO: paste your Firebase config from Console → Project Settings → General → Web app
const firebaseConfig = {
  apiKey: "PASTE_ME",
  authDomain: "PASTE_ME.firebaseapp.com",
  projectId: "PASTE_ME",
  storageBucket: "PASTE_ME.appspot.com",
  messagingSenderId: "PASTE_ME",
  appId: "PASTE_ME"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ===== Expose helpers globally (DB.*) =====
window.DB = {
  // --------- Invoices ---------
  async saveInvoice(inv) {
    const ref = await addDoc(collection(db, "invoices"), { ...inv, created_at: new Date().toISOString() });
    return ref.id;
  },
  async listInvoicesBetween(fromISO, toISO) {
    // invoice_date saved as "YYYY-MM-DD" string
    const qy = query(
      collection(db, "invoices"),
      where("invoice_date", ">=", fromISO),
      where("invoice_date", "<=", toISO),
      orderBy("invoice_date", "asc")
    );
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // --------- Staff / Attendance ---------
  async listStaff() {
    const snap = await getDocs(collection(db, "staff"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async upsertAttendance(att) {
    // att: { staff_id, day:'YYYY-MM-DD', name, role, status, note }
    const id = `${att.staff_id}_${att.day}`;
    await setDoc(doc(db, "staff_attendance", id), { ...att, created_at: new Date().toISOString() }, { merge: true });
    return id;
  },
  async listAttendanceByDay(dayISO) {
    const qy = query(collection(db, "staff_attendance"), where("day", "==", dayISO));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // --------- Patients (read-only) ---------
  async listPatients() {
    const snap = await getDocs(collection(db, "patients"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};
</script>
