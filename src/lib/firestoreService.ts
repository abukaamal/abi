import { doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from './auth';

export interface BerandaData {
  title?: string;
  subtitle?: string;
  subtitle_1?: string;
  subtitle_2?: string;
  subtitle_3?: string;
  subtitles?: string[];
  experience?: string;
  image_url?: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  image_url_5?: string;
  logo_name?: string;
  [key: string]: any;
}

export interface TentangData {
  title?: string;
  name?: string;
  location?: string;
  description?: string;
  description_1?: string;
  description_2?: string;
  description_3?: string;
  descriptions?: string[];
  skills?: string;
  achievement?: string;
  image_url?: string;
  [key: string]: any;
}

export interface GalleryItem {
  id?: string;
  name?: string;
  desc?: string;
  icon?: string;
  color?: string;
  link?: string;
}

export interface ContactData {
  email?: string;
  phone?: string;
  address?: string;
  map_url?: string;
}

export interface FooterData {
  copyright?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

export interface PortfolioData {
  beranda: BerandaData;
  tentang: TentangData;
  gallery: GalleryItem[];
  contact: ContactData;
  footer: FooterData;
  messages: any[];
}

const DEFAULT_BERANDA: BerandaData = {
  title: 'Imat Abu Kamal',
  subtitle_1: 'Perjalanan dari Kelas, Kebun, dan Malam bersama generasi muda',
  subtitle_2: 'Dalam setiap langkah yang saya ambil, ada lima sahabat yang selalu menemani: keyakinan bahwa ada kekuatan lebih besar yang mengatur segalanya, rendah hati karena ilmu yang saya miliki hanyalah setetes dari samudra, tawakkal setelah ikhtiar maksimal, tidak putus asa saat jalan terasa berat, dan kerja keras sebagai wujud syukur atas setiap kesempatan.',
  subtitle_3: 'Bukan karena saya istimewa, tapi karena saya ingin belajar menjadi lebih baik. Dari kelima nilai inilah saya merasakan ketentraman – bukan dari pujian atau pengakuan, tapi dari kesadaran bahwa setiap usaha adalah bagian dari proses yang lebih besar.',
  subtitle: 'Perjalanan dari Kelas, Kebun, dan Malam bersama generasi muda',
  subtitles: [
    'Perjalanan dari Kelas, Kebun, dan Malam bersama generasi muda',
    'Dalam setiap langkah yang saya ambil, ada lima sahabat yang selalu menemani: keyakinan bahwa ada kekuatan lebih besar yang mengatur segalanya, rendah hati karena ilmu yang saya miliki hanyalah setetes dari samudra, tawakkal setelah ikhtiar maksimal, tidak putus asa saat jalan terasa berat, dan kerja keras sebagai wujud syukur atas setiap kesempatan.',
    'Bukan karena saya istimewa, tapi karena saya ingin belajar menjadi lebih baik. Dari kelima nilai inilah saya merasakan ketentraman – bukan dari pujian atau pengakuan, tapi dari kesadaran bahwa setiap usaha adalah bagian dari proses yang lebih besar.'
  ],
  experience: '12 Tahun sebagai pengajar di SMP MEFENG',
  image_url: 'https://res.cloudinary.com/deslfnurw/image/upload/v1784469443/imat_hneseh.webp',
  image_url_2: 'https://ui-avatars.com/api/?name=Imat+Developer&size=400&background=7c3aed&color=fff&font-size=0.5&bold=true',
  image_url_3: 'https://ui-avatars.com/api/?name=Imat+Fullstack&size=400&background=059669&color=fff&font-size=0.45&bold=true',
  image_url_4: 'https://ui-avatars.com/api/?name=Imat+Creator&size=400&background=dc2626&color=fff&font-size=0.5&bold=true',
  image_url_5: 'https://ui-avatars.com/api/?name=Imat+Portfolio&size=400&background=f59e0b&color=fff&font-size=0.5&bold=true',
  logo_name: 'Imat<span style="-webkit-text-fill-color:#1e293b;"> Abu Kamal</span>'
};

const DEFAULT_TENTANG: TentangData = {
  title: 'Tentang Saya',
  name: 'Imat Abu Kamal',
  location: 'Maluku Utara, Indonesia',
  description_1: 'Saya seorang pengembang perangkat lunak dengan fokus pada ekosistem JavaScript, React, Node JS, PHP, dan cloud – bukan karena saya ingin disebut hebat, tapi karena saya percaya teknologi seharusnya menjadi alat yang memberdayakan, bukan menakutkan.',
  description_2: 'Keyakinan ini saya hidup setiap hari, tidak hanya di balik layar monitor, tetapi juga di ruang kelas SMP MEFENG, tempat saya belajar menjadi pengajar, dan di bangku kuliah sebagai mahasiswa semester akhir Program Studi IPS Fakultas Inovasi Pendidikan, Universitas Nahdlatul Ulama Maluku Utara.',
  description_3: 'Di sanalah saya menemukan bahwa teknologi dan ilmu sosial bukanlah dua dunia yang terpisah; keduanya adalah dua sisi dari mata uang yang sama – keduanya berbicara tentang manusia, tentang bagaimana kita saling memahami, memberdayakan, dan tumbuh bersama.',
  descriptions: [
    'Saya seorang pengembang perangkat lunak dengan fokus pada ekosistem JavaScript, React, Node JS, PHP, dan cloud – bukan karena saya ingin disebut hebat, tapi karena saya percaya teknologi seharusnya menjadi alat yang memberdayakan, bukan menakutkan.',
    'Keyakinan ini saya hidup setiap hari, tidak hanya di balik layar monitor, tetapi juga di ruang kelas SMP MEFENG, tempat saya belajar menjadi pengajar, dan di bangku kuliah sebagai mahasiswa semester akhir Program Studi IPS Fakultas Inovasi Pendidikan, Universitas Nahdlatul Ulama Maluku Utara.',
    'Di sanalah saya menemukan bahwa teknologi dan ilmu sosial bukanlah dua dunia yang terpisah; keduanya adalah dua sisi dari mata uang yang sama – keduanya berbicara tentang manusia, tentang bagaimana kita saling memahami, memberdayakan, dan tumbuh bersama.'
  ],
  skills: 'React, Node.js, Firebase, Python, PHP, UI/UX, dan integrasi API.',
  achievement: 'Google Developer Group · 2023',
  image_url: 'https://res.cloudinary.com/deslfnurw/image/upload/v1784469443/imat_hneseh.webp'
};

const DEFAULT_GALLERY: GalleryItem[] = [
  { name: 'HTML5', desc: 'Struktur web, semantic, API', icon: 'fab fa-html5', color: '#E34F26', link: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { name: 'CSS3', desc: 'Styling, animasi, responsive', icon: 'fab fa-css3-alt', color: '#1572B6', link: 'https://developer.mozilla.org/en-US/docs/Web/CSS' },
  { name: 'JavaScript', desc: 'ES6+, React, Node.js', icon: 'fab fa-js', color: '#f7df1e', link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
  { name: 'Github', desc: 'Platform hosting repository', icon: 'fa-brands fa-github', color: '#181717', link: 'https://docs.github.com/' },
  { name: 'React', desc: 'Hooks, Context, Next.js', icon: 'fab fa-react', color: '#61dafb', link: 'https://reactjs.org/' },
  { name: 'Node.js', desc: 'Express, REST API, GraphQL', icon: 'fab fa-node-js', color: '#339933', link: 'https://nodejs.org/' },
  { name: 'PHP', desc: 'Laravel, WordPress, backend', icon: 'fa-brands fa-php', color: '#777BB4', link: 'https://php.net/' },
  { name: 'Laravel', desc: 'PHP Framework, MVC, Artisan', icon: 'fa-brands fa-laravel', color: '#FF2D20', link: 'https://laravel.com/' },
  { name: 'UI/UX', desc: 'Figma, desain sistem', icon: 'fas fa-paint-brush', color: '#a259ff', link: 'https://www.figma.com/' },
  { name: 'Cloud', desc: 'AWS, Firebase, Vercel', icon: 'fas fa-cloud', color: '#ff9900', link: 'https://aws.amazon.com/' },
  { name: 'Python', desc: 'Django, Flask, data', icon: 'fab fa-python', color: '#3776ab', link: 'https://www.python.org/' },
  { name: 'WordPress', desc: 'CMS, Blog, Website Builder', icon: 'fa-brands fa-wordpress', color: '#21759B', link: 'https://wordpress.org/' }
];

const DEFAULT_CONTACT: ContactData = {
  email: 'imatabukamal@gmail.com',
  phone: '+62 813 5571 1415',
  address: 'Jl. Trans No. 1, RT 000 RW 000, Desa Sumber Makmur, Kecamatan Gane Timur, Kab. Halmahera Selatan, Maluku Utara 98773',
  map_url: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d974.0086130173052!2d127.83918302119983!3d-0.12289386570680741!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sid!2sid!4v1771074321113!5m2!1sid!2sid'
};

const DEFAULT_FOOTER: FooterData = {
  copyright: '2026 Imat Abu Kamal. All rights reserved.',
  github: 'https://github.com/yourusername',
  linkedin: 'https://linkedin.com/in/yourusername',
  twitter: 'https://twitter.com/yourusername',
  instagram: 'https://instagram.com/yourusername',
  facebook: '',
  youtube: ''
};

// Helper function to race Firestore promises with a fast timeout fallback
const fetchWithTimeout = <T>(promise: Promise<T>, timeoutMs = 2500, fallback: T): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then(res => { clearTimeout(timer); return res; }),
    timeoutPromise
  ]).catch(() => fallback);
};

// Seed missing default content into Firestore (disabled per user instruction: do not modify Firestore database)
export const seedFirestoreDefaults = async () => {
  // No-op: Do not mutate or change Firestore database
  return;
};

// Fetch all portfolio data directly from Firestore with fast fallback for low connectivity
export const fetchPortfolioFromFirestore = async (): Promise<PortfolioData> => {
  const berandaPromise = getDoc(doc(db, 'content', 'beranda'))
    .then(snap => snap.exists() ? (snap.data() as BerandaData) : DEFAULT_BERANDA)
    .catch(() => DEFAULT_BERANDA);

  const tentangPromise = getDoc(doc(db, 'content', 'tentang'))
    .then(snap => snap.exists() ? (snap.data() as TentangData) : DEFAULT_TENTANG)
    .catch(() => DEFAULT_TENTANG);

  const galleryPromise = getDocs(collection(db, 'gallery'))
    .then(snap => !snap.empty ? snap.docs.map(d => ({ id: d.id, ...d.data() })) as GalleryItem[] : DEFAULT_GALLERY)
    .catch(() => DEFAULT_GALLERY);

  const contactPromise = getDoc(doc(db, 'content', 'contact'))
    .then(snap => snap.exists() ? (snap.data() as ContactData) : DEFAULT_CONTACT)
    .catch(() => DEFAULT_CONTACT);

  const footerPromise = getDoc(doc(db, 'content', 'footer'))
    .then(snap => snap.exists() ? (snap.data() as FooterData) : DEFAULT_FOOTER)
    .catch(() => DEFAULT_FOOTER);

  const messagesPromise = getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50)))
    .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
    .catch(() => []);

  const [beranda, tentang, gallery, contact, footer, messages] = await Promise.all([
    fetchWithTimeout(berandaPromise, 3000, DEFAULT_BERANDA),
    fetchWithTimeout(tentangPromise, 3000, DEFAULT_TENTANG),
    fetchWithTimeout(galleryPromise, 3000, DEFAULT_GALLERY),
    fetchWithTimeout(contactPromise, 3000, DEFAULT_CONTACT),
    fetchWithTimeout(footerPromise, 3000, DEFAULT_FOOTER),
    fetchWithTimeout(messagesPromise, 3000, [])
  ]);

  return {
    beranda: beranda || DEFAULT_BERANDA,
    tentang: tentang || DEFAULT_TENTANG,
    gallery: (gallery && gallery.length > 0) ? gallery : DEFAULT_GALLERY,
    contact: contact || DEFAULT_CONTACT,
    footer: footer || DEFAULT_FOOTER,
    messages: messages || []
  };
};

// Save Contact Message to Firestore (including base64 photo data URL)
export const saveMessageToFirestore = async (messagePayload: {
  nama: string;
  email: string;
  telpon: string;
  alamat: string;
  pesan: string;
  photoUrl?: string;
  photoBase64?: string;
}) => {
  try {
    const docData = {
      ...messagePayload,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp()
    };
    await addDoc(collection(db, 'messages'), docData);
    return { success: true, message: 'Pesan berhasil disimpan di Firestore!' };
  } catch (err: any) {
    console.error('Firestore save message error:', err);
    throw new Error(err.message || 'Gagal menyimpan pesan ke Firestore.');
  }
};

// Record user login into Firestore logins collection
export const recordUserLoginToFirestore = async (user: {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}) => {
  try {
    if (!user.email) return;
    await addDoc(collection(db, 'logins'), {
      nama: user.displayName || 'User Google',
      email: user.email,
      picture: user.photoURL || '',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Record login warning:', err);
  }
};
