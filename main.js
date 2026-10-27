const canvas = document.getElementById("layar-game"), ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap"), ctxMini = minimap.getContext("2d");
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
minimap.width = 120; minimap.height = 120;

// 1. SISTEM GRID PETA (3000 x 3000 Pixel)
const TILE_SIZE = 50, COLS = 60, ROWS = 60;
const duniaW = COLS * TILE_SIZE, duniaH = ROWS * TILE_SIZE;
let mapGrid = [];

// GENERATOR BENTUK PULAU PIXEL ORGANIK
for(let r=0; r<ROWS; r++) {
    let rowData = [];
    for(let c=0; c<COLS; c++) {
        let isLand = false;
        // Gabungan beberapa blok abstrak untuk membentuk pulau yang tidak bulat
        const blobs = [
            {x: 30, y: 30, r: 16}, {x: 20, y: 24, r: 12}, 
            {x: 42, y: 32, r: 14}, {x: 35, y: 18, r: 11}, 
            {x: 26, y: 40, r: 13}, {x: 32, y: 45, r: 10}
        ];
        for(let b of blobs) {
            // Efek "noise" sederhana agar tepian bloknya bergerigi tidak rata
            let noise = Math.sin(c * 0.5) + Math.cos(r * 0.5); 
            if (Math.hypot(c - b.x, r - b.y) + noise <= b.r) { isLand = true; break; }
        }
        rowData.push(isLand ? 2 : 0); // 2 = Rumput, 0 = Laut
    }
    mapGrid.push(rowData);
}

// Lapis 2: Membuat Pasir Pantai di tepi pulau & override Danau/Toko/Pelabuhan
for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
        // Jika rumput bersentuhan dengan laut, ubah jadi pasir pantai
        if (mapGrid[r][c] === 2) {
            let dekatLaut = false;
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    if (r+i>=0 && r+i<ROWS && c+j>=0 && c+j<COLS) {
                        if (mapGrid[r+i][c+j] === 0) dekatLaut = true;
                    }
                }
            }
            if (dekatLaut) mapGrid[r][c] = 1; // 1 = Pasir
        }

        // Danau kecil abstrak di dalam pulau
        if ( (c>=18 && c<=21 && r>=24 && r<=28) || (c>=20 && c<=25 && r>=26 && r<=29) || (c>=23 && c<=26 && r>=24 && r<=26) ) {
            mapGrid[r][c] = 3; // 3 = Air Danau
        }
        
        // Toko (Area Merah di atas rumput)
        if (c >= 35 && c <= 38 && r >= 26 && r <= 29) mapGrid[r][c] = 5; // 5 = Toko

        // Pelabuhan (Menjorok dari tepi pantai ke laut selatan)
        if (c >= 30 && c <= 33 && r >= 48 && r <= 56) mapGrid[r][c] = 4; // 4 = Kayu
    }
}

const warnaTile = { 0: "#1565c0", 1: "#f4a460", 2: "#7cb342", 3: "#29b6f6", 4: "#795548", 5: "#d32f2f" };

// 2. KONTROL & DATABASE
const ukuranKarakter = 24, radiusK = ukuranKarakter / 2;
let playerX = 1500, playerY = 1500, gerakX = 0, gerakY = 0, kecepatan = 4;

const dbIkan = [
    { nama: "Sepat", rarity: "Common", w: "#7f8c8d", c: 20, h: 10, min: 0.1, max: 0.3 }, { nama: "Wader", rarity: "Common", w: "#7f8c8d", c: 20, h: 12, min: 0.1, max: 0.2 }, { nama: "Nila", rarity: "Common", w: "#7f8c8d", c: 20, h: 15, min: 0.3, max: 1.0 }, { nama: "Mujair", rarity: "Common", w: "#7f8c8d", c: 18, h: 14, min: 0.2, max: 0.8 }, { nama: "Betik", rarity: "Common", w: "#7f8c8d", c: 18, h: 11, min: 0.1, max: 0.4 }, { nama: "Cere", rarity: "Common", w: "#7f8c8d", c: 15, h: 5, min: 0.05, max: 0.1 }, { nama: "Cetul", rarity: "Common", w: "#7f8c8d", c: 15, h: 6, min: 0.05, max: 0.1 }, { nama: "Lundu", rarity: "Common", w: "#7f8c8d", c: 15, h: 18, min: 0.2, max: 0.5 }, { nama: "Keting", rarity: "Common", w: "#7f8c8d", c: 15, h: 16, min: 0.2, max: 0.5 }, { nama: "Belanak", rarity: "Common", w: "#7f8c8d", c: 12, h: 20, min: 0.4, max: 1.2 }, { nama: "Teri", rarity: "Common", w: "#7f8c8d", c: 15, h: 8, min: 0.01, max: 0.05 }, { nama: "Selar", rarity: "Common", w: "#7f8c8d", c: 12, h: 22, min: 0.2, max: 0.6 }, { nama: "Kembung", rarity: "Common", w: "#7f8c8d", c: 12, h: 25, min: 0.3, max: 0.8 }, { nama: "Lemuru", rarity: "Common", w: "#7f8c8d", c: 12, h: 20, min: 0.1, max: 0.5 }, { nama: "Baronang", rarity: "Common", w: "#7f8c8d", c: 10, h: 30, min: 0.4, max: 1.0 },
    { nama: "Lele", rarity: "Uncommon", w: "#2ecc71", c: 10, h: 40, min: 0.5, max: 2.0 }, { nama: "Gabus", rarity: "Uncommon", w: "#2ecc71", c: 9, h: 50, min: 0.6, max: 2.5 }, { nama: "Patin", rarity: "Uncommon", w: "#2ecc71", c: 8, h: 60, min: 1.0, max: 4.0 }, { nama: "Bawal", rarity: "Uncommon", w: "#2ecc71", c: 8, h: 55, min: 0.8, max: 3.0 }, { nama: "Mas", rarity: "Uncommon", w: "#2ecc71", c: 8, h: 45, min: 0.5, max: 2.0 }, { nama: "Kakap Merah", rarity: "Uncommon", w: "#2ecc71", c: 7, h: 80, min: 1.0, max: 5.0 }, { nama: "Kerapu", rarity: "Uncommon", w: "#2ecc71", c: 7, h: 90, min: 0.8, max: 6.0 }, { nama: "Tenggiri", rarity: "Uncommon", w: "#2ecc71", c: 6, h: 100, min: 2.0, max: 7.0 }, { nama: "Tongkol", rarity: "Uncommon", w: "#2ecc71", c: 6, h: 70, min: 1.5, max: 4.0 },
    { nama: "Gurame", rarity: "Rare", w: "#3498db", c: 4, h: 150, min: 1.0, max: 4.0 }, { nama: "Bandeng", rarity: "Rare", w: "#3498db", c: 4, h: 130, min: 0.8, max: 3.0 }, { nama: "Cakalang", rarity: "Rare", w: "#3498db", c: 3.5, h: 180, min: 2.0, max: 6.0 }, { nama: "Mahi-Mahi", rarity: "Rare", w: "#3498db", c: 3, h: 250, min: 5.0, max: 15.0 }, { nama: "Barakuda", rarity: "Rare", w: "#3498db", c: 3, h: 220, min: 4.0, max: 12.0 }, { nama: "Hiu Karang", rarity: "Rare", w: "#3498db", c: 2, h: 400, min: 10.0, max: 30.0 }, { nama: "Pari", rarity: "Rare", w: "#3498db", c: 2, h: 300, min: 5.0, max: 20.0 },
    { nama: "Arwana", rarity: "Epic", w: "#9b59b6", c: 1, h: 800, min: 2.0, max: 5.0 }, { nama: "Tuna Sirip Biru", rarity: "Epic", w: "#9b59b6", c: 0.8, h: 1500, min: 50.0, max: 200.0 }, { nama: "Hiu Putih", rarity: "Epic", w: "#9b59b6", c: 0.5, h: 2000, min: 80.0, max: 300.0 }, { nama: "Marlin", rarity: "Epic", w: "#9b59b6", c: 0.7, h: 1200, min: 40.0, max: 100.0 }, { nama: "Sturgeon", rarity: "Epic", w: "#9b59b6", c: 0.5, h: 1800, min: 20.0, max: 60.0 },
    { nama: "Pari Manta", rarity: "Legendary", w: "#f1c40f", c: 0.2, h: 4000, min: 100.0, max: 500.0 }, { nama: "Orca", rarity: "Legendary", w: "#f1c40f", c: 0.15, h: 5000, min: 200.0, max: 800.0 }, { nama: "Hiu Martil", rarity: "Legendary", w: "#f1c40f", c: 0.2, h: 3500, min: 60.0, max: 250.0 }, { nama: "Arapaima", rarity: "Legendary", w: "#f1c40f", c: 0.25, h: 3000, min: 40.0, max: 150.0 },
    { nama: "Megalodon", rarity: "Mythical", w: "#e74c3c", c: 0.05, h: 15000, min: 500.0, max: 2000.0 }, { nama: "Kraken", rarity: "Mythical", w: "#e74c3c", c: 0.05, h: 18000, min: 800.0, max: 3000.0 }, { nama: "Mosasaurus", rarity: "Mythical", w: "#e74c3c", c: 0.05, h: 12000, min: 400.0, max: 1500.0 }, { nama: "Naga Laut", rarity: "Mythical", w: "#e74c3c", c: 0.04, h: 20000, min: 1000.0, max: 4000.0 },
    { nama: "Leviathan", rarity: "Ascendant", w: "#1abc9c", c: 0.01, h: 50000, min: 5000.0, max: 15000.0 }, { nama: "Jormungandr", rarity: "Ascendant", w: "#1abc9c", c: 0.01, h: 60000, min: 6000.0, max: 20000.0 }, { nama: "Cthulhu", rarity: "Ascendant", w: "#1abc9c", c: 0.008, h: 80000, min: 3000.0, max: 9000.0 }, { nama: "Paus Kosmik", rarity: "Ascendant", w: "#1abc9c", c: 0.005, h: 100000, min: 10000.0, max: 50000.0 },
    { nama: "SpongeBob", rarity: "Secret", w: "#000000", c: 0.02, h: 7777, min: 0.1, max: 0.1 }, { nama: "Patrick", rarity: "Secret", w: "#000000", c: 0.02, h: 7777, min: 0.2, max: 0.2 }, { nama: "Sepatu Bekas", rarity: "Secret", w: "#000000", c: 0.1, h: 1, min: 0.5, max: 1.0 }, { nama: "Peti Harta", rarity: "Secret", w: "#000000", c: 0.05, h: 25000, min: 10.0, max: 50.0 }
];

const barangToko = {
    joran: [
        { id: "j1", nama: "Joran Kayu", rarity: "Uncommon", harga: 200, waktuGigit: 11000, luck: 1.2 }, { id: "j2", nama: "Joran Fiber", rarity: "Rare", harga: 800, waktuGigit: 9000, luck: 1.8 },
        { id: "j3", nama: "Joran Carbon", rarity: "Epic", harga: 3000, waktuGigit: 7000, luck: 2.5 }, { id: "j4", nama: "Joran Pro", rarity: "Legendary", harga: 10000, waktuGigit: 5000, luck: 4.0 },
        { id: "j5", nama: "Joran Master", rarity: "Mythical", harga: 35000, waktuGigit: 3500, luck: 7.0 }, { id: "j6", nama: "Joran Dewa", rarity: "Ascendant", harga: 100000, waktuGigit: 2000, luck: 15.0 }
    ],
    umpan: [
        { id: "u1", nama: "Pelet", rarity: "Uncommon", harga: 300, buffWaktu: -1000, buffLuck: 1.3 }, { id: "u2", nama: "Roti", rarity: "Uncommon", harga: 500, buffWaktu: -1500, buffLuck: 1.5 },
        { id: "u3", nama: "Udang", rarity: "Rare", harga: 1200, buffWaktu: -2000, buffLuck: 2.0 }, { id: "u4", nama: "Cumi", rarity: "Epic", harga: 4000, buffWaktu: -3000, buffLuck: 3.0 },
        { id: "u5", nama: "Ikan Kecil", rarity: "Legendary", harga: 12000, buffWaktu: -4000, buffLuck: 5.0 }, { id: "u6", nama: "Katak", rarity: "Mythical", harga: 40000, buffWaktu: -5000, buffLuck: 8.0 },
        { id: "u7", nama: "Lure Emas", rarity: "Ascendant", harga: 150000, buffWaktu: -6000, buffLuck: 20.0 }
    ],
    potion: [
        { id: "p1", nama: "Potion Hoki", rarity: "Epic", harga: 300, durasi: 300, tipe: "luck", efek: 2.0 }, { id: "p2", nama: "Potion Ngebut", rarity: "Epic", harga: 300, durasi: 300, tipe: "waktu", efek: -4000 }
    ]
};

let uangPemain = 0, tasIkan = [], tasPotion = [];
let tasJoran = [{ id: "j0", nama: "Joran Bambu", rarity: "Common", waktuGigit: 12000, luck: 1.0, harga: 0 }];
let tasUmpan = [{ id: "u0", nama: "Cacing", rarity: "Common", buffWaktu: 0, buffLuck: 1.0, harga: 0 }];
let joranAktif = tasJoran[0], umpanAktif = tasUmpan[0], potionAktif = null, sisaWaktuPotion = 0;
let statusMancing = 0, progressTarik = 0, lokasiSaatIni = "darat", timeoutMancing = null;

const tombolAksi = document.getElementById("tombol-aksi"), wadahBar = document.getElementById("wadah-bar"), isiBar = document.getElementById("isi-bar");

const joystick = nipplejs.create({ zone: document.getElementById('area-analog'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 100 });
joystick.on('move', (evt, data) => { if (statusMancing === 0) { gerakX = Math.cos(data.angle.radian) * kecepatan; gerakY = -Math.sin(data.angle.radian) * kecepatan; } });
joystick.on('end', () => { gerakX = 0; gerakY = 0; });

// 3. LOGIKA KOLISI TILEMAP (Biar gak nabrak toko/air)
function getTileAt(x, y) {
    let c = Math.floor(x / TILE_SIZE), r = Math.floor(y / TILE_SIZE);
    if(c < 0 || c >= COLS || r < 0 || r >= ROWS) return 0;
    return mapGrid[r][c];
}
function bisaJalan(x, y) {
    let t = getTileAt(x, y);
    return [1, 2, 4].includes(t); // Hanya bisa jalan di Pasir(1), Rumput(2), Kayu/Pelabuhan(4)
}

function updateLokasi() {
    if(statusMancing > 0) return;
    
    // Mengecek blok di sekitar pemain untuk mengubah fungsi tombol
    let adaAir = false, adaToko = false;
    for(let i=-20; i<=20; i+=20) {
        for(let j=-20; j<=20; j+=20) {
            let t = getTileAt(playerX + j, playerY + i);
            if(t === 0 || t === 3) adaAir = true; // Dekat laut(0) atau danau(3)
            if(t === 5) adaToko = true;           // Dekat toko(5)
        }
    }

    if (adaToko) { lokasiSaatIni = "toko"; tombolAksi.innerText = "🛒 TOKO"; tombolAksi.style.backgroundColor = "#ff9800"; }
    else if (adaAir) { lokasiSaatIni = "air"; tombolAksi.innerText = "🎣 LEMPAR"; tombolAksi.style.backgroundColor = "#f5deb3"; }
    else { lokasiSaatIni = "darat"; tombolAksi.innerText = "JALAN"; tombolAksi.style.backgroundColor = "#ccc"; }
}

function gambarGrid(kCtx, isMini = false) {
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            kCtx.fillStyle = warnaTile[mapGrid[r][c]];
            kCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE+1, TILE_SIZE+1); // +1 tutup celah garis
        }
    }
    if(!isMini) { // Teks toko hanya di layar utama
        kCtx.fillStyle = "#fff"; kCtx.font = "bold 16px sans-serif";
        kCtx.fillText("TOKO", 35.5 * TILE_SIZE, 27 * TILE_SIZE);
    }
}

function jalankanGame() {
    let nx = playerX + gerakX, ny = playerY + gerakY;
    
    // Pengecekan 4 sudut karakter agar pixel-perfect collision
    if (bisaJalan(nx - radiusK, playerY - radiusK) && bisaJalan(nx + radiusK, playerY - radiusK) && 
        bisaJalan(nx - radiusK, playerY + radiusK) && bisaJalan(nx + radiusK, playerY + radiusK)) playerX = nx;
        
    if (bisaJalan(playerX - radiusK, ny - radiusK) && bisaJalan(playerX + radiusK, ny - radiusK) && 
        bisaJalan(playerX - radiusK, ny + radiusK) && bisaJalan(playerX + radiusK, ny + radiusK)) playerY = ny;

    updateLokasi();

    // UPDATE KAMERA & GAMBAR UTAMA
    let camX = Math.max(0, Math.min(playerX - canvas.width / 2, duniaW - canvas.width));
    let camY = Math.max(0, Math.min(playerY - canvas.height / 2, duniaH - canvas.height));
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.save(); ctx.translate(-camX, -camY);

    gambarGrid(ctx, false);
    ctx.fillStyle = "blue"; // Gambar pemain
    ctx.fillRect(playerX - radiusK, playerY - radiusK, ukuranKarakter, ukuranKarakter);
    ctx.restore();

    // MINIMAP GTA RADAR
    ctxMini.clearRect(0, 0, 120, 120); ctxMini.save();
    ctxMini.beginPath(); ctxMini.arc(60, 60, 56, 0, Math.PI * 2); ctxMini.clip(); // Masking bentuk bulat
    ctxMini.translate(60, 60); ctxMini.scale(0.04, 0.04); ctxMini.translate(-playerX, -playerY);
    gambarGrid(ctxMini, true);
    ctxMini.fillStyle = "white"; ctxMini.beginPath(); ctxMini.arc(playerX, playerY, 60, 0, Math.PI*2); ctxMini.fill();
    ctxMini.restore();

    // MINIGAME TARIK IKAN
    if (statusMancing === 2) {
        progressTarik -= 0.3; if (progressTarik < 0) progressTarik = 0; isiBar.style.width = progressTarik + "%";
        if (progressTarik >= 100) {
            statusMancing = 0; progressTarik = 0; wadahBar.style.display = "none"; updateLokasi();
            let bP = (potionAktif && potionAktif.tipe === "luck") ? potionAktif.efek : 1.0;
            let tL = joranAktif.luck * (umpanAktif ? umpanAktif.buffLuck : 1.0) * bP;
            let rngT = 0, bI = dbIkan.map(i => { let b = (i.rarity === "Common") ? i.c : (i.c * tL); rngT += b; return { ...i, bA: b }; });
            let roll = Math.random() * rngT, kum = 0, dp = dbIkan[0];
            for (let i of bI) { kum += i.bA; if (roll <= kum) { dp = i; break; } }
            
            let br = (Math.random() * (dp.max - dp.min) + dp.min).toFixed(2), hr = Math.floor(dp.h * br);
            tasIkan.push({ ...dp, berat: br, hargaJual: hr }); updateTeksUI(); alert(`Berhasil! Dapat [${dp.rarity}] ${dp.nama} | ${br}kg`);
        }
    }
    requestAnimationFrame(jalankanGame);
}
jalankanGame();

// TIMER POTION
setInterval(() => {
    if(sisaWaktuPotion > 0) {
        sisaWaktuPotion--;
        let m = Math.floor(sisaWaktuPotion / 60).toString().padStart(2, '0'), s = (sisaWaktuPotion % 60).toString().padStart(2, '0');
        document.getElementById("info-potion").innerText = `${potionAktif.nama} (${m}:${s})`;
        if(sisaWaktuPotion <= 0) { potionAktif = null; document.getElementById("info-potion").innerText = "Tidak Ada"; alert("Efek Potion habis!"); }
    }
}, 1000);

// LOGIKA BATAL MANCING & LEMPAR
tombolAksi.addEventListener("click", () => {
    if (statusMancing === 1) { clearTimeout(timeoutMancing); statusMancing = 0; updateLokasi(); return; }
    if(lokasiSaatIni === "toko") {
        document.getElementById("panel-toko").style.display = "flex"; document.getElementById("panel-tas").style.display = "none"; document.getElementById("panel-profil").style.display = "none"; renderToko("joran");
    } else if(lokasiSaatIni === "air" && statusMancing === 0) {
        statusMancing = 1; tombolAksi.innerText = "BATAL"; tombolAksi.style.backgroundColor = "#e74c3c";
        let bW = (potionAktif && potionAktif.tipe === "waktu") ? potionAktif.efek : 0;
        let wT = Math.max(2000, joranAktif.waktuGigit + (umpanAktif ? umpanAktif.buffWaktu : 0) + bW);
        timeoutMancing = setTimeout(() => { if(statusMancing === 1) { statusMancing = 2; wadahBar.style.display = "block"; tombolAksi.innerText = "TARIK!"; tombolAksi.style.backgroundColor = "#3498db"; } }, wT);
    }
});
canvas.addEventListener("pointerdown", () => { if (statusMancing === 2) progressTarik += 10; });

function updateTeksUI() {
    document.getElementById("uang-profil").innerText = uangPemain; document.getElementById("uang-toko").innerText = uangPemain;
    document.getElementById("info-joran").innerText = joranAktif.nama; document.getElementById("info-umpan").innerText = umpanAktif.nama;
    document.getElementById("total-tangkapan").innerText = tasIkan.length;
}

document.getElementById("tombol-profil").addEventListener("click", () => { document.getElementById("panel-profil").style.display = "flex"; document.getElementById("panel-tas").style.display = "none"; document.getElementById("panel-toko").style.display = "none"; updateTeksUI(); });
document.getElementById("tutup-profil").addEventListener("click", () => document.getElementById("panel-profil").style.display = "none");
document.getElementById("tombol-tas").addEventListener("click", () => { document.getElementById("panel-tas").style.display = "flex"; document.getElementById("panel-profil").style.display = "none"; document.getElementById("panel-toko").style.display = "none"; renderTas(tasIkan, "ikan"); });
document.getElementById("tutup-tas").addEventListener("click", () => document.getElementById("panel-tas").style.display = "none");
document.getElementById("tutup-toko").addEventListener("click", () => document.getElementById("panel-toko").style.display = "none");

function renderTas(dataArray, tipe) {
    const ul = document.getElementById("daftar-item"); ul.innerHTML = ""; ul.className = (tipe === "ikan") ? "grid-ikan" : "";
    if (dataArray.length === 0) return ul.innerHTML = "<li>Kosong.</li>";
    dataArray.forEach((i, idx) => {
        let li = document.createElement("li");
        if (tipe === "ikan") { li.innerHTML = `<div><b style="color:${i.w}">${i.nama}</b><br>${i.berat} kg<br>💰 ${i.hargaJual}</div>`; }
        else {
            let dis = (tipe === "joran" && joranAktif.id === i.id) || (tipe === "umpan" && umpanAktif.id === i.id);
            li.innerHTML = `<b style="color:${i.w||'#333'}">${i.nama}</b><br>` + (tipe === "potion" ? `<small>Durasi 5 Menit</small><br>` : "");
            let b = document.createElement("button"); b.className = "btn-equip"; b.innerText = dis ? "Dipakai" : "Pakai"; b.disabled = dis; if(dis) b.style.background = "gray";
            b.onclick = () => {
                if(tipe === "joran") joranAktif = i; else if(tipe === "umpan") umpanAktif = i;
                else if(tipe === "potion") { if(sisaWaktuPotion > 0) return alert("Potion masih aktif!"); potionAktif = i; sisaWaktuPotion = i.durasi; tasPotion.splice(idx, 1); }
                updateTeksUI(); renderTas(dataArray, tipe);
            }; li.appendChild(b);
        } ul.appendChild(li);
    });
}

const tabsTas = ["ikan", "joran", "umpan", "potion"];
tabsTas.forEach(id => document.getElementById("btn-tab-" + id).addEventListener("click", (e) => {
    tabsTas.forEach(t => document.getElementById("btn-tab-" + t).classList.remove("tab-aktif")); e.target.classList.add("tab-aktif");
    renderTas((id==="ikan")?tasIkan : (id==="joran")?tasJoran : (id==="umpan")?tasUmpan : tasPotion, id);
}));

document.getElementById("btn-jual-semua").addEventListener("click", () => {
    if(tasIkan.length === 0) return alert("Tas ikan kosong!");
    let tot = 0; tasIkan.forEach(i => tot += i.hargaJual); uangPemain += tot; tasIkan = []; updateTeksUI(); alert(`Terjual seharga 💰 ${tot}`);
});

function renderToko(tipe) {
    const ul = document.getElementById("daftar-toko"); ul.innerHTML = "";
    barangToko[tipe].forEach(i => {
        let li = document.createElement("li"); li.innerHTML = `<b>${i.nama}</b><br>💰 ${i.harga} <br>`;
        let b = document.createElement("button"); b.className = "btn-beli"; b.innerText = "Beli";
        b.onclick = () => {
            if(uangPemain < i.harga) return alert("Uang tidak cukup!");
            if(tipe === "joran" && tasJoran.find(j => j.id === i.id)) return alert("Sudah punya!");
            if(tipe === "umpan" && tasUmpan.find(u => u.id === i.id)) return alert("Sudah punya!");
            uangPemain -= i.harga;
            if(tipe === "joran") tasJoran.push({...i}); else if(tipe === "umpan") tasUmpan.push({...i}); else tasPotion.push({...i});
            updateTeksUI(); alert(`Membeli ${i.nama}!`);
        }; li.appendChild(b); ul.appendChild(li);
    });
}

const tabsToko = ["joran", "umpan", "potion"];
tabsToko.forEach(id => document.getElementById("btn-toko-" + id).addEventListener("click", (e) => {
    tabsToko.forEach(t => document.getElementById("btn-toko-" + t).classList.remove("tab-aktif")); e.target.classList.add("tab-aktif"); renderToko(id);
}));
// ==========================================
// SISTEM PENYIMPANAN TELEGRAM CLOUD STORAGE
// ==========================================

// Fungsi untuk Menyimpan Data Game
function simpanGameKeTelegram() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        // Bungkus semua data penting ke dalam objek
        const dataGame = {
            uangPemain: uangPemain,
            tasIkan: tasIkan,
            tasPotion: tasPotion,
            tasJoran: tasJoran,
            tasUmpan: tasUmpan,
            joranAktifId: joranAktif.id,
            umpanAktifId: umpanAktif.id
        };

        // Simpan ke Cloud Storage Telegram (menggunakan key "save_data_game")
        Telegram.TelegramWebApp?.CloudStorage?.setItem("save_data_game", JSON.stringify(dataGame), (err, success) => {
            if (success) {
                console.log("Progress game berhasil disimpan ke Cloud Telegram!");
            } else if (err) {
                console.log("Gagal menyimpan ke Cloud Telegram:", err);
            }
        });
    } else {
        // Cadangan jika dibuka di browser biasa (menggunakan localStorage)
        const dataGame = { uangPemain, tasIkan, tasPotion, tasJoran, tasUmpan, joranAktifId: joranAktif.id, umpanAktifId: umpanAktif.id };
        localStorage.setItem("save_data_game_local", JSON.stringify(dataGame));
    }
}

// Fungsi untuk Memuat/Load Data Game saat pertama kali dibuka
function muatGameDariTelegram() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.getItem("save_data_game", (err, value) => {
            if (!err && value) {
                try {
                    const dataGame = JSON.parse(value);
                    terapkanDataGame(dataGame);
                    console.log("Progress game berhasil dimuat dari Cloud Telegram!");
                } catch (e) {
                    console.log("Gagal memparsing data save:", e);
                }
            } else {
                console.log("Belum ada data save di Telegram, menggunakan data baru.");
            }
        });
    } else {
        // Cadangan untuk browser biasa
        let savedLocal = localStorage.getItem("save_data_game_local");
        if (savedLocal) {
            try {
                const dataGame = JSON.parse(savedLocal);
                terapkanDataGame(dataGame);
            } catch (e) {}
        }
    }
}

// Helper untuk memasukkan data yang dimuat ke variabel game
function terapkanDataGame(data) {
    if (data.uangPemain !== undefined) uangPemain = data.uangPemain;
    if (data.tasIkan) tasIkan = data.tasIkan;
    if (data.tasPotion) tasPotion = data.tasPotion;
    if (data.tasJoran) tasJoran = data.tasJoran;
    if (data.tasUmpan) tasUmpan = data.tasUmpan;
    
    // Sinkronkan objek joran & umpan aktif berdasarkan ID yang disimpan
    if (data.joranAktifId) {
        let foundJoran = tasJoran.find(j => j.id === data.joranAktifId);
        if (foundJoran) joranAktif = foundJoran;
    }
    if (data.umpanAktifId) {
        let foundUmpan = tasUmpan.find(u => u.id === data.umpanAktifId);
        if (foundUmpan) umpanAktif = foundUmpan;
    }
    
    updateTeksUI(); // Perbarui tampilan UI setelah data dimuat
}

// 1. Panggil fungsi load saat game pertama kali dijalankan/di-refresh
window.addEventListener("DOMContentLoaded", () => {
    muatGameDirequest = setTimeout(muatGameDariTelegram, 500);
});

// 2. Otomatis simpan data saat pemain melakukan aksi penting (Contoh: Menjual ikan, Beli item, atau Ganti alat)
// Kamu bisa menyisipkan fungsi `simpanGameKeTelegram()` di event berikut:

document.getElementById("btn-jual-semua").addEventListener("click", () => {
    // ... kode asli jual semua ...
    simpanGameKeTelegram(); // <-- Tambahkan ini agar tersimpan saat jual ikan
});
// ==========================================
// SISTEM PENYIMPANAN GABUNGAN (TELEGRAM CLOUD & DEVICE LOCALSTORAGE)
// ==========================================

function simpanGame() {
    // 1. Bungkus semua data penting ke dalam objek
    const dataGame = {
        uangPemain: uangPemain,
        tasIkan: tasIkan,
        tasPotion: tasPotion,
        tasJoran: tasJoran,
        tasUmpan: tasUmpan,
        joranAktifId: joranAktif.id,
        umpanAktifId: umpanAktif.id
    };

    const jsonString = JSON.stringify(dataGame);

    // 2. Simpan ke Device (Local Storage) - Pasti tersimpan di HP/PC
    try {
        localStorage.setItem("save_data_game_device", jsonString);
        console.log("Progress berhasil disimpan ke perangkat (Device)!");
    } catch (e) {
        console.log("Gagal menyimpan ke device:", e);
    }

    // 3. Simpan ke Telegram Cloud Storage (Jika dibuka di dalam Telegram)
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.setItem("save_data_game", jsonString, (err, success) => {
            if (success) {
                console.log("Progress berhasil disinkronkan ke Cloud Telegram!");
            }
        });
    }
}

// Fungsi untuk Memuat Data (Prioritaskan Telegram Cloud, jika kosong ambil dari Device)
function muatGame() {
    const terapkanData = (jsonString) => {
        try {
            const dataGame = JSON.parse(jsonString);
            if (dataGame.uangPemain !== undefined) uangPemain = dataGame.uangPemain;
            if (dataGame.tasIkan) tasIkan = dataGame.tasIkan;
            if (dataGame.tasPotion) tasPotion = dataGame.tasPotion;
            if (dataGame.tasJoran) tasJoran = dataGame.tasJoran;
            if (dataGame.tasUmpan) tasUmpan = dataGame.tasUmpan;
            
            if (dataGame.joranAktifId) {
                let foundJoran = tasJoran.find(j => j.id === dataGame.joranAktifId);
                if (foundJoran) joranAktif = foundJoran;
            }
            if (dataGame.umpanAktifId) {
                let foundUmpan = tasUmpan.find(u => u.id === dataGame.umpanAktifId);
                if (foundUmpan) umpanAktif = foundUmpan;
            }
            updateTeksUI();
            console.log("Data game berhasil dimuat!");
        } catch (e) {
            console.log("Gagal memparsing data save:", e);
        }
    };

    // Coba muat dari Telegram Cloud terlebih dahulu
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        Telegram.WebApp.CloudStorage.getItem("save_data_game", (err, value) => {
            if (!err && value) {
                terapkanData(value);
            } else {
                // Jika di Telegram kosong, fallback ambil dari Device
                muatDariDevice(terapkanData);
            }
        });
    } else {
        // Jika bukan di Telegram (buka langsung di browser), ambil dari Device
        muatDariDevice(terapkanData);
    }
}

function muatDariDevice(callback) {
    let savedLocal = localStorage.getItem("save_data_game_device");
    if (savedLocal) {
        callback(savedLocal);
        console.log("Data dimuat dari memori perangkat (Device).");
    } else {
        console.log("Belum ada data save di perangkat.");
    }
}

// Panggil fungsi muat data saat game pertama kali dijalankan
window.addEventListener("DOMContentLoaded", () => {
    setTimeout(muatGame, 300);
});
