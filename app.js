// Import Firebase v9+ SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, setDoc, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC_5rRoGaTBvSOeoEGWrYQb-rbRAutoyDc",
  authDomain: "artexhibition-fc70b.firebaseapp.com",
  projectId: "artexhibition-fc70b",
  storageBucket: "artexhibition-fc70b.appspot.com", // fixed!
  messagingSenderId: "886386461540",
  appId: "1:886386461540:web:fac96288a337b4d7c2c871",
  measurementId: "G-SHQR135N1Z"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// UI elements
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sellBtn = document.getElementById("sellBtn");
const cartBtn = document.getElementById("cartBtn");

const authModal = document.getElementById("authModal");
const sellModal = document.getElementById("sellModal");
const cartModal = document.getElementById("cartModal");

// Helpers
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

// Auth modal
let isSignup = false;
signupBtn.onclick = () => { isSignup = true; document.getElementById("authTitle").innerText = "Sign Up"; show(authModal); };
loginBtn.onclick = () => { isSignup = false; document.getElementById("authTitle").innerText = "Login"; show(authModal); };
document.getElementById("closeAuth").onclick = () => hide(authModal);

// Auth form
document.getElementById("authForm").onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  try {
    if (isSignup) {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Signed up!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in!");
    }
    hide(authModal);
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// Auth state
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadGallery();
    loadCart();
  } else {
    loginBtn.style.display = "inline-block";
    signupBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    loadGallery();
    document.getElementById("cartCount").innerText = "0";
  }
});

// Logout
logoutBtn.onclick = async () => {
  await signOut(auth);
};

// Sell art
sellBtn.onclick = () => {
  if (!auth.currentUser) return alert("Login first");
  show(sellModal);
};
document.getElementById("closeSell").onclick = () => hide(sellModal);

document.getElementById("sellForm").onsubmit = async e => {
  e.preventDefault();
  const title = document.getElementById("artTitle").value;
  const price = parseFloat(document.getElementById("artPrice").value);
  const file = document.getElementById("artFile").files[0];
  const desc = document.getElementById("artDesc").value;

  const fileRef = ref(storage, "artworks/" + Date.now() + "_" + file.name);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await addDoc(collection(db, "artworks"), {
    userId: auth.currentUser.uid,
    title, price, description: desc,
    imageUrl: url,
    createdAt: serverTimestamp()
  });

  alert("✅ Artwork uploaded!");
  hide(sellModal);
  loadGallery();
};

// Gallery
async function loadGallery() {
  const q = query(collection(db, "artworks"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  snap.forEach(docSnap => {
    const art = docSnap.data();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${art.imageUrl}" alt="${art.title}">
      <h3>${art.title}</h3>
      <p>₦${art.price}</p>
      <button onclick="addToCart('${docSnap.id}', '${art.title}', ${art.price}, '${art.imageUrl}')">Add to Cart</button>
    `;
    gallery.appendChild(div);
  });
}

// Cart
window.addToCart = async (id, title, price, imageUrl) => {
  if (!auth.currentUser) return alert("Login first");
  await setDoc(doc(db, "users", auth.currentUser.uid, "cart", id), {
    title, price, imageUrl, quantity: 1
  });
  loadCart();
};

cartBtn.onclick = () => {
  if (!auth.currentUser) return alert("Login first");
  show(cartModal);
  loadCart();
};
document.getElementById("closeCart").onclick = () => hide(cartModal);

async function loadCart() {
  if (!auth.currentUser) return;
  const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "cart"));
  const cartItems = document.getElementById("cartItems");
  let total = 0;
  cartItems.innerHTML = "";
  snap.forEach(docSnap => {
    const item = docSnap.data();
    total += item.price;
    const div = document.createElement("div");
    div.innerHTML = `${item.title} - ₦${item.price}`;
    cartItems.appendChild(div);
  });
  document.getElementById("cartTotal").innerText = "Total: ₦" + total;
  document.getElementById("cartCount").innerText = snap.size;
}

document.getElementById("checkoutBtn").onclick = async () => {
  alert("✅ Checkout complete!");
  const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "cart"));
  snap.forEach(async d => {
    await deleteDoc(d.ref);
  });
  loadCart();
};
