/* ================== STORAGE KEYS ================== */
const LS_USERS="merrys_users";
const LS_SESSION="merrys_session";
const LS_CART="merrys_cart";
const LS_FAVS="merrys_favs";
const LS_COIN="merrys_coin";
const LS_LAST_ORDER="merrys_last_order";

/* ================== HELPERS ================== */
const qs=(s)=>document.querySelector(s);
const qsa=(s)=>[...document.querySelectorAll(s)];
const money=(n)=>n.toLocaleString("mn-MN")+"₮";

/* Coin & points config */
const COIN_RATE = 5000; // 1 coin = 5000₮
qs("#coinRateText").textContent = COIN_RATE;

/* Referral map positions (for map UI) */
const courierStages = [
  { left:"20%", top:"78%" }, // start (store)
  { left:"45%", top:"60%" }, // preparing / leaving
  { left:"70%", top:"42%" }, // on the way
  { left:"86%", top:"24%" }  // near you
];

/* ---------------- USERS ---------------- */
const getUsers=()=>JSON.parse(localStorage.getItem(LS_USERS)||"[]");
const setUsers=(u)=>localStorage.setItem(LS_USERS,JSON.stringify(u));
const getSession=()=>JSON.parse(localStorage.getItem(LS_SESSION)||"null");
const setSession=(s)=>localStorage.setItem(LS_SESSION,JSON.stringify(s));
const clearSession=()=>localStorage.removeItem(LS_SESSION);

/* current user helper */
function getCurrentUser(){
  const s=getSession();
  if(!s) return null;
  return getUsers().find(u=>u.id===s.id) || null;
}

/* Generate referral code: MC + 6 symbol */
function genRefCode(){
  return "MC" + Math.random().toString(36).substring(2,8).toUpperCase();
}

/* ---------------- COIN ---------------- */
const getCoin=()=>Number(localStorage.getItem(LS_COIN)||"0");
const setCoin=(v)=>localStorage.setItem(LS_COIN,String(v));

function renderCoin(){
  qs("#coinBalance").textContent = getCoin();
}

/* ---------------- CART ---------------- */
const getCart=()=>JSON.parse(localStorage.getItem(LS_CART)||"[]");
const setCart=(items)=>{
  localStorage.setItem(LS_CART,JSON.stringify(items));
  renderCart();
};
function addToCart(item){
  const cart=getCart();
  const ex=cart.find(x=>x.title===item.title && x.price===item.price);
  if(ex) ex.qty+=item.qty;
  else cart.push(item);
  setCart(cart);
}
function cartTotal(cart){return cart.reduce((s,i)=>s+i.price*i.qty,0);}
function removeFromCart(id){setCart(getCart().filter(x=>x.id!==id));}
function changeQty(id,delta){
  const cart=getCart();
  const it=cart.find(x=>x.id===id);
  if(!it) return;
  it.qty+=delta;
  if(it.qty<=0) return removeFromCart(id);
  setCart(cart);
}

/* ---------------- FAVORITES ---------------- */
const getFavs=()=>JSON.parse(localStorage.getItem(LS_FAVS)||"[]");
const setFavs=(list)=>localStorage.setItem(LS_FAVS,JSON.stringify(list));

/* ================== AUTH GATE ================== */
const authGate=qs("#authGate");
const appRoot=qs("#appRoot");
const tabBtns=qsa(".tab-btn");
const loginForm=qs("#loginForm");
const registerForm=qs("#registerForm");

tabBtns.forEach(btn=>{
  btn.onclick=()=>{
    tabBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const t=btn.dataset.tab;
    loginForm.classList.toggle("active",t==="login");
    registerForm.classList.toggle("active",t==="register");
  };
});
qsa("[data-go]").forEach(x=>{
  x.onclick=()=>{
    const go=x.dataset.go;
    tabBtns.forEach(b=>b.classList.toggle("active",b.dataset.tab===go));
    loginForm.classList.toggle("active",go==="login");
    registerForm.classList.toggle("active",go==="register");
  };
});

/* Register with referral */
registerForm.onsubmit=(e)=>{
  e.preventDefault();
  const name=qs("#regName").value.trim();
  const email=qs("#regEmail").value.trim().toLowerCase();
  const pass=qs("#regPass").value;
  const refInput=qs("#regRefCode").value.trim().toUpperCase();
  const users=getUsers();
  const msg=qs("#registerMsg");

  if(users.some(u=>u.email===email)){
    msg.textContent="Энэ и-мэйл бүртгэлтэй байна.";
    msg.style.color="var(--danger)";
    return;
  }

  // Referral check
  let refUser=null;
  if(refInput){
    refUser=users.find(u=>u.referralCode===refInput);
    if(!refUser){
      msg.textContent="Урилгын код олдсонгүй. Кодыг шалгаад дахин оролдоно уу.";
      msg.style.color="var(--danger)";
      return;
    }
  }

  const id=crypto.randomUUID();
  const newUser={
    id,
    name,
    email,
    pass,
    createdAt:Date.now(),
    referralCode:genRefCode(),
    points:0,
    invitedBy:refUser?refUser.id:null
  };

  if(refUser){
    refUser.points=(refUser.points||0)+100;     // inviter
    newUser.points=(newUser.points||0)+50;      // new user
  }

  users.push(newUser);
  setUsers(users);

  msg.textContent="Амжилттай бүртгэгдлээ! Одоо нэвтэрнэ үү.";
  msg.style.color="var(--success)";
  registerForm.reset();
};

/* Login */
loginForm.onsubmit=(e)=>{
  e.preventDefault();
  const email=qs("#loginEmail").value.trim().toLowerCase();
  const pass=qs("#loginPass").value;
  const user=getUsers().find(u=>u.email===email && u.pass===pass);
  const msg=qs("#loginMsg");
  if(!user){
    msg.textContent="И-мэйл эсвэл нууц үг буруу.";
    msg.style.color="var(--danger)";
    return;
  }
  setSession({id:user.id,email:user.email});
  if(getCoin()===0) setCoin(5); // welcome coin
  openApp();
};

qs("#logoutBtn").onclick=()=>{clearSession();location.reload();};

/* ================== NAV / SECTIONS ================== */
function initNav(){
  qsa("[data-menu]").forEach(btn=>{
    const dd=qs("#menu-"+btn.dataset.menu);
    btn.onclick=(e)=>{
      e.stopPropagation();
      qsa(".dropdown").forEach(d=>d!==dd && d.classList.remove("open"));
      dd.classList.toggle("open");
    };
  });
  document.addEventListener("click",()=>qsa(".dropdown").forEach(d=>d.classList.remove("open")));
  qsa("[data-section]").forEach(b=>b.onclick=()=>showSection(b.dataset.section));
}
function showSection(key){
  qsa(".section").forEach(s=>s.classList.remove("active"));
  qs("#section-"+key)?.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ================== COFFEE LOAD (250 JSON) ================== */
let COFFEES=[];

async function loadCoffees(){
  try{
    const res=await fetch("coffee-list.json");
    COFFEES=await res.json();
    renderCoffeeMenu();
    fillBaseSelect();
  }catch(err){
    qs("#menuStatus").textContent="coffee-list.json олдсонгүй. Файлаа шалгаарай.";
  }
}

/* ================== MENU (250) ================== */
function coffeeCard(c){
  return `
  <div class="card">
    <div class="card-img" style="background-image:url('${c.image}')"></div>
    <div class="card-title">${c.name}</div>
    <div class="card-meta">${c.desc || ""} · ${c.category.toUpperCase()}</div>
    <div class="card-price">${money(c.price)}</div>
    <div class="actions">
      <button class="btn soft" data-addcoffee="${c.id}">Сагсанд</button>
      <button class="btn outline" data-makefrom="${c.id}">Найруулах</button>
    </div>
  </div>`;
}

function renderCoffeeMenu(){
  const search=qs("#searchInput").value.toLowerCase();
  const cat=qs("#filterCategory").value;

  const list=COFFEES.filter(c=>{
    const okName=c.name.toLowerCase().includes(search);
    const okCat=(cat==="all"||c.category===cat);
    return okName && okCat;
  });

  qs("#coffeeGrid").innerHTML=list.map(coffeeCard).join("");
  qs("#menuStatus").textContent=`Нийт ${list.length} кофе харагдаж байна.`;

  qsa("[data-addcoffee]").forEach(b=>{
    b.onclick=()=>{
      const c=COFFEES.find(x=>x.id===b.dataset.addcoffee);
      addToCart({id:c.id,title:c.name,price:c.price,qty:1,meta:c.category});
      openCart();
    };
  });

  qsa("[data-makefrom]").forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.makefrom;
      qs("#baseCoffeeSelect").value=id;
      builderState.baseId=id;
      updatePreview();
      showSection("builder");
    };
  });
}
qs("#searchInput").oninput=renderCoffeeMenu;
qs("#filterCategory").onchange=renderCoffeeMenu;

/* ================== EXTRAS ================== */
const EXTRAS=[
  {id:"ex-milk-regular",name:"Regular Milk",price:1500,desc:"200ml",image:"https://images.unsplash.com/photo-1550583724-b2692b85b150"},
  {id:"ex-milk-oat",name:"Oat Milk",price:2500,desc:"Vegan",image:"https://images.unsplash.com/photo-1550583724-b2692b85b150"},
  {id:"ex-syrup-vanilla",name:"Vanilla Syrup",price:1000,desc:"10ml",image:"https://images.unsplash.com/photo-1541976076758-347942db1971"},
  {id:"ex-syrup-caramel",name:"Caramel Syrup",price:1000,desc:"10ml",image:"https://images.unsplash.com/photo-1541976076758-347942db1971"},
  {id:"ex-cin",name:"Cinnamon",price:700,desc:"Topping",image:"https://images.unsplash.com/photo-1512568400610-62da28bc8a13"},
  {id:"ex-croissant",name:"Butter Croissant",price:5900,desc:"Pastry",image:"https://images.unsplash.com/photo-1542831371-29b0f74f9713"}
];

function renderExtras(){
  qs("#extrasGrid").innerHTML=EXTRAS.map(x=>`
  <div class="card">
    <div class="card-img" style="background-image:url('${x.image}')"></div>
    <div class="card-title">${x.name}</div>
    <div class="card-meta">${x.desc}</div>
    <div class="card-price">${money(x.price)}</div>
    <div class="actions">
      <button class="btn soft" data-addextra="${x.id}">Сагсанд</button>
    </div>
  </div>`).join("");

  qsa("[data-addextra]").forEach(b=>{
    b.onclick=()=>{
      const e=EXTRAS.find(x=>x.id===b.dataset.addextra);
      addToCart({id:e.id,title:e.name,price:e.price,qty:1,meta:"extra"});
      openCart();
    };
  });
}

/* ================== BUILDER ================== */
const builderConfig={
  size:[
    {key:"small",label:"Small 250ml",mul:1.0},
    {key:"medium",label:"Medium 350ml",mul:1.2},
    {key:"large",label:"Large 500ml",mul:1.45}
  ],
  temp:[
    {key:"hot",label:"Hot",add:0},
    {key:"cold",label:"Cold",add:800}
  ],
  milk:[
    {key:"none",label:"No milk",add:0},
    {key:"regular",label:"Regular",add:1500},
    {key:"oat",label:"Oat",add:2500},
    {key:"almond",label:"Almond",add:2800}
  ],
  syrup:[
    {key:"none",label:"No syrup",add:0},
    {key:"vanilla",label:"Vanilla",add:1000},
    {key:"caramel",label:"Caramel",add:1000},
    {key:"hazelnut",label:"Hazelnut",add:1200}
  ],
  topping:[
    {key:"none",label:"None",add:0},
    {key:"cinnamon",label:"Cinnamon",add:700},
    {key:"cocoa",label:"Cocoa dust",add:800},
    {key:"caramel",label:"Caramel drizzle",add:1200}
  ]
};

const builderState={
  baseId:null,
  size:"medium",
  temp:"hot",
  milk:"regular",
  syrup:"none",
  topping:"none",
  qty:1
};

function fillBaseSelect(){
  const sel=qs("#baseCoffeeSelect");
  sel.innerHTML=COFFEES.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  builderState.baseId=COFFEES[0]?.id || null;
}

function renderOptions(list,mountId,key){
  const mount=qs(mountId);
  mount.innerHTML=list.map(o=>{
    const active=builderState[key]===o.key?"active":"";
    return `<button class="opt ${active}" data-opt="${key}:${o.key}">${o.label}</button>`;
  }).join("");
}

function calcBuilder(){
  const base=COFFEES.find(x=>x.id===builderState.baseId);
  if(!base) return {unit:0,total:0,base:null};
  const size=builderConfig.size.find(x=>x.key===builderState.size);
  const temp=builderConfig.temp.find(x=>x.key===builderState.temp);
  const milk=builderConfig.milk.find(x=>x.key===builderState.milk);
  const syrup=builderConfig.syrup.find(x=>x.key===builderState.syrup);
  const topping=builderConfig.topping.find(x=>x.key===builderState.topping);

  let unit = base.price*size.mul + temp.add + milk.add + syrup.add + topping.add;
  unit=Math.round(unit);
  return {unit,total:unit*builderState.qty,base,size,temp,milk,syrup,topping};
}

function updatePreview(){
  const {unit,total,base,size,temp,milk,syrup,topping}=calcBuilder();
  qs("#unitPrice").textContent=money(unit);
  qs("#totalPrice").textContent=money(total);
  qs("#previewTag").textContent=`${temp.label} · ${size.label.split(" ")[0]}`;
  qs("#previewImage").style.backgroundImage=base?.image?`url('${base.image}')`:"none";

  qs("#previewList").innerHTML=`
    <li><span>Суурь</span><strong>${base?.name||"—"}</strong></li>
    <li><span>Хэмжээ</span><strong>${size.label}</strong></li>
    <li><span>Темп</span><strong>${temp.label}</strong></li>
    <li><span>Сүү</span><strong>${milk.label}</strong></li>
    <li><span>Syrup</span><strong>${syrup.label}</strong></li>
    <li><span>Topping</span><strong>${topping.label}</strong></li>
    <li><span>Тоо</span><strong>${builderState.qty}</strong></li>`;
}

function initBuilder(){
  renderOptions(builderConfig.size,"#sizeOptions","size");
  renderOptions(builderConfig.temp,"#tempOptions","temp");
  renderOptions(builderConfig.milk,"#milkOptions","milk");
  renderOptions(builderConfig.syrup,"#syrupOptions","syrup");
  renderOptions(builderConfig.topping,"#toppingOptions","topping");

  qs("#baseCoffeeSelect").onchange=(e)=>{
    builderState.baseId=e.target.value;
    updatePreview();
  };

  qs("#section-builder").onclick=(e)=>{
    const b=e.target.closest("[data-opt]");
    if(!b) return;
    const [k,v]=b.dataset.opt.split(":");
    builderState[k]=v;
    initBuilder();
    updatePreview();
  };

  qs("#incQty").onclick=()=>{
    builderState.qty=Math.min(20,builderState.qty+1);
    qs("#qtyValue").textContent=builderState.qty;
    updatePreview();
  };
  qs("#decQty").onclick=()=>{
    builderState.qty=Math.max(1,builderState.qty-1);
    qs("#qtyValue").textContent=builderState.qty;
    updatePreview();
  };

  qs("#addCustomBtn").onclick=()=>{
    const {unit,base,size,temp,milk,syrup,topping}=calcBuilder();
    if(!base) return;

    const title=
      `${base.name} · ${size.label.split(" ")[0]} · ${temp.label}`+
      (milk.key!=="none"?` · ${milk.label}`:"")+
      (syrup.key!=="none"?` · ${syrup.label}`:"")+
      (topping.key!=="none"?` · ${topping.label}`:"");

    addToCart({
      id:"custom-"+crypto.randomUUID(),
      title, price:unit, qty:builderState.qty,
      meta:"Custom"
    });

    // save favorite
    const favs=getFavs();
    favs.unshift({title,unit,qty:builderState.qty,image:base.image,ts:Date.now()});
    setFavs(favs.slice(0,12));
    renderFavs();

    builderState.qty=1; qs("#qtyValue").textContent=1;
    updatePreview();
    openCart();
  };

  updatePreview();
}

function renderFavs(){
  const list=getFavs();
  const mount=qs("#favoritesGrid");
  if(!list.length){
    mount.innerHTML=`<div class="card"><div class="muted">Favorites алга.</div></div>`;
    return;
  }
  mount.innerHTML=list.map(f=>`
    <div class="card">
      <div class="card-img" style="background-image:url('${f.image||""}')"></div>
      <div class="card-title">${f.title}</div>
      <div class="card-price">${money(f.unit*f.qty)}</div>
      <div class="actions">
        <button class="btn soft" data-addfav="${f.ts}">Дахин</button>
      </div>
    </div>`).join("");

  qsa("[data-addfav]").forEach(b=>{
    b.onclick=()=>{
      const f=list.find(x=>String(x.ts)===b.dataset.addfav);
      addToCart({id:"fav-"+f.ts,title:f.title,price:f.unit,qty:f.qty,meta:"Favorite"});
      openCart();
    };
  });
}

/* ================== CART UI ================== */
function renderCart(){
  const cart=getCart();
  qs("#cartItems").innerHTML=cart.length?cart.map(i=>`
    <div class="cart-item">
      <div class="row">
        <strong>${i.title}</strong>
        <button class="ghost" data-remove="${i.id}">Устгах</button>
      </div>
      <div class="row">
        <span class="muted">${i.meta||""}</span>
        <span>${money(i.price)}</span>
      </div>
      <div class="row">
        <div class="qty">
          <button class="qty-btn" data-dec="${i.id}">−</button>
          <span>${i.qty}</span>
          <button class="qty-btn" data-inc="${i.id}">+</button>
        </div>
        <strong>${money(i.price*i.qty)}</strong>
      </div>
    </div>`).join(""):`<div class="muted">Сагс хоосон.</div>`;

  qsa("[data-remove]").forEach(b=>b.onclick=()=>removeFromCart(b.dataset.remove));
  qsa("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,+1));
  qsa("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));

  qs("#cartTotal").textContent=money(cartTotal(cart));
  qs("#cartCount").textContent=cart.reduce((s,i)=>s+i.qty,0);
}

/* Open/close cart */
const cartDrawer=qs("#cartDrawer");
const backdrop=qs("#backdrop");
function openCart(){cartDrawer.classList.add("open");backdrop.classList.add("show");}
function closeCart(){cartDrawer.classList.remove("open");backdrop.classList.remove("show");}
qs("#openCartBtn").onclick=openCart;
qs("#closeCartBtn").onclick=closeCart;
backdrop.onclick=closeCart;

/* ================== PAYMENT (QPay / Visa / Coin) ================== */
let payType="qpay";
qsa(".pay-btn").forEach(b=>{
  b.onclick=()=>{
    qsa(".pay-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    payType=b.dataset.pay;
  };
});

qs("#checkoutBtn").onclick=()=>{
  const cart=getCart();
  if(!cart.length) return alert("Сагс хоосон байна.");
  const total=cartTotal(cart);
  const msg=qs("#payMsg");
  msg.textContent="";

  if(payType==="coin"){
    const coins=getCoin();
    const needed=Math.ceil(total/COIN_RATE);
    if(coins<needed){
      msg.textContent=`Coin хүрэхгүй байна. Шаардлагатай: ${needed} coin.`;
      msg.style.color="var(--danger)";
      return;
    }
    setCoin(coins-needed);
    msg.textContent=`Coin-оор төлбөр амжилттай. ${needed} coin хасагдлаа.`;
    msg.style.color="var(--success)";
  }else if(payType==="qpay"){
    msg.textContent="QPay төлбөр амжилттай (Demo).";
    msg.style.color="var(--success)";
  }else{
    msg.textContent="Visa/Master төлбөр амжилттай (Demo).";
    msg.style.color="var(--success)";
  }

  // Save last order for tracking
  localStorage.setItem(LS_LAST_ORDER, JSON.stringify({ total, ts:Date.now() }));

  // Referral points from order total (1 point / 10,000₮)
  const users=getUsers();
  const s=getSession();
  const u=users.find(x=>x.id===s.id);
  if(u){
    const earned=Math.max(1,Math.floor(total/10000));
    u.points=(u.points||0)+earned;
    setUsers(users);
  }

  setCart([]);
  renderCoin();
  renderUserMeta();
  startTrackingAuto();
  showSection("track");
};

/* Coin topup demo */
qs("#topupCoinBtn").onclick=()=>{
  const add=prompt("Хэдэн coin цэнэглэх вэ? (demo)");
  const n=Number(add);
  if(!n||n<=0) return;
  setCoin(getCoin()+n);
  renderCoin();
};

/* ================== TRACKING DEMO + MAP ================== */
let trackTimer=null;

function setTrackingStep(step){
  ["st1","st2","st3","st4"].forEach((id,idx)=>{
    qs("#"+id).classList.toggle("active", idx<step);
  });
}

/* map courier dot position */
function setCourierPosition(stageIdx){
  const dot=qs("#courierDot");
  const idx=Math.min(stageIdx,courierStages.length-1);
  const p=courierStages[idx];
  if(!dot||!p) return;
  dot.style.left=p.left;
  dot.style.top=p.top;
}

function startTrackingAuto(){
  qs("#trackStatusText").textContent="Захиалга баталгаажлаа";
  setTrackingStep(1);
  setCourierPosition(0);

  let p=0;
  clearInterval(trackTimer);
  trackTimer=setInterval(()=>{
    p+=25;
    qs("#progressBar").style.width=p+"%";
    if(p===25){
      setTrackingStep(2);
      qs("#trackStatusText").textContent="Бэлтгэж байна";
      qs("#courierPos").textContent="Store";
      setCourierPosition(1);
    }
    if(p===50){
      setTrackingStep(3);
      qs("#trackStatusText").textContent="Замд гарлаа";
      qs("#courierPos").textContent="Midway";
      setCourierPosition(2);
    }
    if(p===75){
      qs("#courierPos").textContent="Near you";
      setCourierPosition(2);
    }
    if(p>=100){
      setTrackingStep(4);
      qs("#trackStatusText").textContent="Хүргэгдлээ";
      qs("#courierPos").textContent="Delivered";
      setCourierPosition(3);
      clearInterval(trackTimer);
    }
  },1200);
}

qs("#startTrackBtn").onclick=()=>{
  const d=qs("#districtSelect").value;
  const a=qs("#addressInput").value.trim();
  if(!a) return alert("Дэлгэрэнгүй хаягаа оруулна уу.");
  qs("#trackStatusText").textContent=`Захиалга баталгаажлаа (${d})`;
  startTrackingAuto();
};

/* ================== INVITE / REFERRAL UI ================== */
function renderInviteList(){
  const u=getCurrentUser();
  if(!u) return;
  const all=getUsers();
  const invited=all.filter(x=>x.invitedBy===u.id);
  const mount=qs("#inviteList");

  if(!invited.length){
    mount.innerHTML="Одоогоор найз урьсан мэдээлэл алга.";
    return;
  }

  mount.innerHTML=invited.map(v=>{
    const dt=v.createdAt?new Date(v.createdAt):null;
    const dStr=dt?dt.toLocaleDateString("mn-MN"):"—";
    return `
      <div class="invite-list-item">
        <div>
          <div><strong>${v.name}</strong></div>
          <div class="muted">${v.email}</div>
        </div>
        <div class="muted" style="font-size:11px">${dStr}</div>
      </div>
    `;
  }).join("");
}

qs("#copyRefBtn").onclick=()=>{
  const code=qs("#myReferralCode").textContent.trim();
  if(!code || code==="—") return;
  if(navigator.clipboard){
    navigator.clipboard.writeText(code).then(()=>{
      alert("Код хууллаа: "+code);
    });
  }else{
    alert("Код: "+code);
  }
};

/* Update user meta (name, points, referral code) */
function renderUserMeta(){
  const u=getCurrentUser();
  if(!u) return;
  qs("#userName").textContent=u.name;
  qs("#pointsBalance").textContent=u.points||0;
  qs("#pointsBalanceBig").textContent=u.points||0;
  qs("#myReferralCode").textContent=u.referralCode||"—";
  renderInviteList();
}

/* ================== INIT APP ================== */
function openApp(){
  const s=getSession();
  if(!s) return;
  authGate.classList.add("hidden");
  appRoot.classList.remove("hidden");

  initNav();
  renderExtras();
  renderCart();
  renderCoin();
  loadCoffees();
  initBuilder();
  renderFavs();
  renderUserMeta();
  setCourierPosition(0);
}

if(getSession()) openApp();
