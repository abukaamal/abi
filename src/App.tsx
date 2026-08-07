import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { initAuth, logout, logAccessToFirestore } from './lib/auth';
import { fetchPortfolioFromFirestore, saveMessageToFirestore, recordUserLoginToFirestore } from './lib/firestoreService';
import { User } from 'firebase/auth';
import LoginScreen from './components/LoginScreen';
import GmailManager from './components/GmailManager';
import AccessLogSection from './components/AccessLogSection';
import { LogOut, User as UserIcon, Mail, ShieldCheck, Clock } from 'lucide-react';

// Types representing the API data structure
interface BerandaData {
  title?: string;
  subtitle?: string;
  experience?: string;
  image_url?: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  image_url_5?: string;
  logo_name?: string;
  [key: string]: string | undefined;
}

interface TentangData {
  name?: string;
  location?: string;
  description?: string;
  skills?: string;
  achievement?: string;
  image_url?: string;
}

interface GalleryItem {
  name?: string;
  desc?: string;
  icon?: string;
  color?: string;
  link?: string;
}

interface ContactData {
  email?: string;
  phone?: string;
  address?: string;
  map_url?: string;
}

interface FooterData {
  copyright?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

interface LogoData {
  logo_name?: string;
  image_url?: string;
  title?: string;
  subtitle?: string;
  error?: boolean;
}

interface PortfolioData {
  beranda?: BerandaData;
  tentang?: TentangData;
  gallery?: GalleryItem[];
  contact?: ContactData;
  footer?: FooterData;
  messages?: any[];
  error?: boolean;
}

const CONFIG = {
  FIELD_KEYS: ['nama', 'email', 'telpon', 'alamat', 'pesan'] as const,
  REGEX: {
    nama: /^[a-zA-Z\s]{2,50}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    alamat: /^.{3,100}$/,
    pesan: /^.{5,500}$/
  },
  MAX_FILE_SIZE: 2 * 1024 * 1024 // 2MB
};

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Navigation State
  const [activePage, setActivePage] = useState<'beranda' | 'tentang' | 'gallery' | 'gmail' | 'contact' | 'akses'>('beranda');
  const [currentAccessTime, setCurrentAccessTime] = useState<string | null>(null);

  // Data Store States
  const [allData, setAllData] = useState<PortfolioData | null>(null);
  const [logoData, setLogoData] = useState<LogoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<boolean>(false);

  // Mobile Navigation State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number>(0);

  // Form States
  const [formValues, setFormValues] = useState({
    nama: '',
    email: '',
    telpon: '',
    alamat: '',
    pesan: ''
  });

  const [formErrors, setFormErrors] = useState({
    nama: false,
    email: false,
    telpon: false,
    alamat: false,
    pesan: false,
    file: false
  });

  const [telponErrorMessage, setTelponErrorMessage] = useState<string>('Nomor telepon harus diawali dengan 0 dan terdiri dari angka (min 8 digit).');
  const [fileErrorMessage, setFileErrorMessage] = useState<string>('File terlalu besar (maksimal 2MB).');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Submit progress state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sanitize helper
  const sanitize = (str?: string): string => {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '');
  };

  // Auth Initialization Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
        setAuthChecked(true);

        logAccessToFirestore(u).then((log) => {
          if (log && log.accessTimeFormatted) {
            setCurrentAccessTime(log.accessTimeFormatted);
          }
        });

        recordUserLoginToFirestore(u);

        if (u.email) {
          setFormValues((prev) => ({
            ...prev,
            email: prev.email || u.email || '',
            nama: prev.nama || u.displayName || ''
          }));
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthChecked(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const res = await Swal.fire({
      title: 'Keluar dari Akun?',
      text: 'Anda akan keluar dari Akun Google dan perlu masuk kembali untuk mengakses aplikasi.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    });

    if (res.isConfirmed) {
      await logout();
      setUser(null);
      setAccessToken(null);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Keluar',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // Helper getters for logo, title, and images
  const getLogoName = () => {
    if (logoData && logoData.logo_name) return logoData.logo_name;
    if (allData && allData.beranda && allData.beranda.logo_name) return allData.beranda.logo_name;
    return '⚡ dev<span style="-webkit-text-fill-color:#1e293b;">folio</span>';
  };

  const getLogoImage = () => {
    if (logoData && logoData.image_url) return logoData.image_url;
    if (allData && allData.beranda && allData.beranda.image_url) return allData.beranda.image_url;
    return '';
  };

  const getPageTitle = () => {
    if (logoData && logoData.title) return logoData.title;
    if (allData && allData.beranda && allData.beranda.title) return allData.beranda.title;
    return 'Imat Abu Kamal';
  };

  const getSubtitle = () => {
    if (logoData && logoData.subtitle) return logoData.subtitle;
    if (allData && allData.beranda && allData.beranda.subtitle) return allData.beranda.subtitle;
    return '';
  };

  const getSubtitles = (): string[] => {
    if (!allData?.beranda) {
      const single = getSubtitle();
      return single ? [single] : [];
    }
    const b = allData.beranda as any;
    const subs: string[] = [];
    let i = 1;
    while (b[`subtitle_${i}`]) {
      if (b[`subtitle_${i}`] && b[`subtitle_${i}`].trim()) subs.push(b[`subtitle_${i}`].trim());
      i++;
    }
    if (subs.length > 0) return subs;

    if (Array.isArray(b.subtitles) && b.subtitles.length > 0) return b.subtitles;
    if (Array.isArray(b.subtitle_array) && b.subtitle_array.length > 0) return b.subtitle_array;
    if (b.subtitle && b.subtitle.trim()) return [b.subtitle.trim()];
    const fallback = getSubtitle();
    return fallback ? [fallback] : [];
  };

  const getDescriptions = (): string[] => {
    if (!allData?.tentang) return [];
    const t = allData.tentang as any;

    const descs: string[] = [];
    let i = 1;
    while (t[`description_${i}`]) {
      if (t[`description_${i}`] && t[`description_${i}`].trim()) descs.push(t[`description_${i}`].trim());
      i++;
    }
    if (descs.length > 0) return descs;

    if (Array.isArray(t.descriptions) && t.descriptions.length > 0) return t.descriptions;
    if (Array.isArray(t.description_array) && t.description_array.length > 0) return t.description_array;
    if (t.description && t.description.trim()) return [t.description.trim()];
    return [];
  };

  // Extract all hero carousel images
  const getHeroImages = (): string[] => {
    const berandaData = allData?.beranda;
    const images: string[] = [];
    if (berandaData) {
      const keys = ['image_url', 'image_url_2', 'image_url_3', 'image_url_4', 'image_url_5'];
      keys.forEach((key) => {
        const url = berandaData[key];
        if (url && url.trim() !== '') {
          images.push(url.trim());
        }
      });
    }
    if (images.length === 0) {
      const fallback = getLogoImage();
      if (fallback && fallback.trim() !== '') {
        images.push(fallback.trim());
      }
    }
    if (images.length === 0) {
      images.push('https://ui-avatars.com/api/?name=Imat+Abu+Kamal&size=400&background=2563eb&color=fff&font-size=0.5&bold=true');
    }
    return images;
  };

  const heroImages = getHeroImages();

  // Social Links helper
  const getSocialLinks = () => {
    if (allData && allData.footer) {
      const footer = allData.footer;
      const links: { key: string; url: string }[] = [];
      const socialKeys = ['github', 'linkedin', 'twitter', 'instagram', 'facebook', 'youtube'] as const;
      socialKeys.forEach((key) => {
        const url = footer[key];
        if (url && url.trim() !== '') {
          links.push({ key, url });
        }
      });
      return links;
    }
    return [];
  };

  const socialIconMap: Record<string, string> = {
    github: 'fab fa-github',
    linkedin: 'fab fa-linkedin-in',
    twitter: 'fab fa-twitter',
    instagram: 'fab fa-instagram',
    facebook: 'fab fa-facebook',
    youtube: 'fab fa-youtube'
  };

  // Fetch Data on mount from Firestore
  useEffect(() => {
    setLoading(true);

    fetchPortfolioFromFirestore()
      .then((data) => {
        if (data) {
          setAllData(data);
          if (data.beranda?.title) {
            document.title = sanitize(data.beranda.title);
          }
          if (data.beranda?.logo_name) {
            setLogoData({
              logo_name: data.beranda.logo_name,
              image_url: data.beranda.image_url,
              title: data.beranda.title,
              subtitle: data.beranda.subtitle
            });
          }
        } else {
          setFetchError(true);
        }
      })
      .catch((err) => {
        console.error('Fetch Firestore data error:', err);
        setFetchError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Update Page Title when logoData or allData changes
  useEffect(() => {
    const title = getPageTitle();
    if (title) {
      document.title = sanitize(title);
    }
  }, [logoData, allData]);

  // Back to top listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // AutoPlay for Hero Carousel
  const startAutoPlay = () => {
    stopAutoPlay();
    if (heroImages.length > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % heroImages.length);
      }, 4000);
    }
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [heroImages.length]);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    let newIndex = index;
    if (newIndex < 0) newIndex = heroImages.length - 1;
    if (newIndex >= heroImages.length) newIndex = 0;
    setCarouselIndex(newIndex);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
    startAutoPlay();
  };

  const navigateTo = (page: 'beranda' | 'tentang' | 'gallery' | 'gmail' | 'contact' | 'akses') => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Scroll to top
  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Phone Validation
  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-+]/g, '');
    if (!/^\d+$/.test(cleanPhone)) {
      return { valid: false, message: 'Nomor telepon hanya boleh berisi angka' };
    }
    if (cleanPhone.length < 8) {
      return { valid: false, message: 'Nomor telepon minimal 8 digit' };
    }
    if (!cleanPhone.startsWith('0')) {
      return { valid: false, message: 'Nomor telepon harus diawali dengan 0' };
    }
    return { valid: true, cleanPhone };
  };

  // Field Validation
  const validateField = (key: keyof typeof formValues, value: string): boolean => {
    const val = value.trim();

    if (key === 'telpon') {
      const result = validatePhone(val);
      if (!result.valid) {
        setTelponErrorMessage(result.message || 'Nomor telepon tidak valid.');
        setFormErrors((prev) => ({ ...prev, [key]: true }));
        return false;
      }
      setFormErrors((prev) => ({ ...prev, [key]: false }));
      return true;
    }

    const regex = CONFIG.REGEX[key as keyof typeof CONFIG.REGEX];
    if (!regex) return true;

    if (!regex.test(val)) {
      setFormErrors((prev) => ({ ...prev, [key]: true }));
      return false;
    }
    setFormErrors((prev) => ({ ...prev, [key]: false }));
    return true;
  };

  const handleInputChange = (key: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    validateField(key, value);
  };

  const handleInputBlur = (key: keyof typeof formValues) => {
    validateField(key, formValues[key]);
  };

  // File Upload Handlers
  const handleFileSelect = (file: File) => {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      setFileErrorMessage('File terlalu besar (maksimal 2MB).');
      setFormErrors((prev) => ({ ...prev, file: true }));
      clearFile();
      return;
    }

    const validTypes = ['image/jpeg', 'image/png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png'];

    if (!validTypes.includes(file.type) || !fileExtension || !validExtensions.includes(fileExtension)) {
      setFileErrorMessage('Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.');
      setFormErrors((prev) => ({ ...prev, file: true }));
      clearFile();
      return;
    }

    setFormErrors((prev) => ({ ...prev, file: false }));
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Modal handlers
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetLoading();
  };

  const resetLoading = () => {
    setIsSubmitting(false);
    setProgress(0);
  };

  // Submit handler
  const sendData = (postData: any) => {
    setIsSubmitting(true);
    setProgress(0);

    const startTime = Date.now();
    let speedFactor = 1;

    const speedTest = new Image();
    speedTest.src = 'https://www.google.com/images/phd/px.gif?cache=' + Date.now();
    speedTest.onload = () => {
      const loadTime = (Date.now() - startTime) / 1000;
      if (loadTime > 1.5) speedFactor = 0.5;
      else if (loadTime < 0.3) speedFactor = 2;
      else speedFactor = 1;
    };

    let progressVal = 0;
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const baseProgress = Math.min(elapsed * 25 * speedFactor, 95);
      progressVal = Math.min(baseProgress, 95);
      setProgress(progressVal);
    }, 100);

    // Prepare photo Data URL or base64 if selected
    const photoBase64 = previewImageUrl || '';

    saveMessageToFirestore({
      nama: postData.nama,
      email: postData.email,
      telpon: postData.telpon,
      alamat: postData.alamat,
      pesan: postData.pesan,
      photoUrl: photoBase64,
      photoBase64: photoBase64
    })
      .then((result) => {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          Swal.fire({
            icon: 'success',
            title: 'Pesan Terkirim!',
            text: 'Data pesan dan foto berhasil tersimpan di Firestore Database.',
            confirmButtonColor: '#2563eb',
            timer: 3000,
            timerProgressBar: true
          });
          setFormValues({
            nama: user?.displayName || '',
            email: user?.email || '',
            telpon: '',
            alamat: '',
            pesan: ''
          });
          clearFile();
          setFormErrors({
            nama: false,
            email: false,
            telpon: false,
            alamat: false,
            pesan: false,
            file: false
          });
          handleCloseModal();
          resetLoading();
        }, 200);
      })
      .catch((err) => {
        clearInterval(progressInterval);
        resetLoading();
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: err?.message || 'Terjadi kesalahan saat menyimpan ke Firestore.',
          confirmButtonColor: '#2563eb'
        });
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let isValid = true;
    CONFIG.FIELD_KEYS.forEach((key) => {
      if (!validateField(key, formValues[key])) {
        isValid = false;
      }
    });

    if (!isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Form tidak lengkap',
        text: 'Mohon periksa kembali semua kolom yang ditandai.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const cleanPhone = formValues.telpon.trim().replace(/[\s\-+]/g, '');
    const postData: any = {
      nama: formValues.nama.trim(),
      email: formValues.email.trim(),
      telpon: cleanPhone,
      alamat: formValues.alamat.trim(),
      pesan: formValues.pesan.trim()
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const base64Data = (e.target?.result as string).split(',')[1];
          postData.foto = base64Data;
          postData.fotoExt = selectedFile.name.split('.').pop()?.toLowerCase();
          sendData(postData);
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Membaca File',
            text: 'Terjadi kesalahan saat membaca file foto.',
            confirmButtonColor: '#2563eb'
          });
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      sendData(postData);
    }
  };

  // Render logo component
  const renderLogo = () => {
    const name = getLogoName();
    const image = getLogoImage();

    if (image && image.trim() !== '') {
      return (
        <div className="logo" id="logoContainer" onClick={() => navigateTo('beranda')}>
          <img src={sanitize(image)} alt="Logo" className="logo-img" />
          <span className="logo-text" dangerouslySetInnerHTML={{ __html: name }} />
        </div>
      );
    }

    return (
      <div className="logo" id="logoContainer" onClick={() => navigateTo('beranda')}>
        <span className="logo-text" dangerouslySetInnerHTML={{ __html: name }} />
      </div>
    );
  };

  // AUTHENTICATION CHECK GATE
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Memeriksa autentikasi Google...</p>
        </div>
      </div>
    );
  }

  // Strictly hide application content if user is NOT logged in with Google account
  if (!user || !accessToken) {
    return (
      <LoginScreen
        onLoginSuccess={(u, token) => {
          setUser(u);
          setAccessToken(token);
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Masuk!',
            text: `Selamat datang, ${u.displayName || u.email || 'Pengguna'}`,
            timer: 2000,
            showConfirmButton: false
          });
        }}
      />
    );
  }

  return (
    <>
      {/* NAVBAR */}
      <nav>
        <div className="container nav-wrapper">
          {renderLogo()}

          <div className="nav-links" id="navLinks">
            <a 
              className={activePage === 'beranda' ? 'active' : ''} 
              data-page="beranda" 
              onClick={() => navigateTo('beranda')}
            >
              Beranda
            </a>
            <a 
              className={activePage === 'tentang' ? 'active' : ''} 
              data-page="tentang" 
              onClick={() => navigateTo('tentang')}
            >
              Tentang
            </a>
            <a 
              className={activePage === 'gallery' ? 'active' : ''} 
              data-page="gallery" 
              onClick={() => navigateTo('gallery')}
            >
              Gallery
            </a>
            <a 
              className={activePage === 'contact' ? 'active' : ''} 
              data-page="contact" 
              onClick={() => navigateTo('contact')}
            >
              Kontak
            </a>
            <a 
              href="#" 
              className="btn-nav" 
              id="openModalBtn" 
              onClick={(e) => { e.preventDefault(); handleOpenModal(); }}
            >
              <i className="fas fa-paper-plane"></i> Pesan
            </a>

            {/* Authenticated User Profile Interactive Avatar & Popover Dropdown */}
            <div className="relative ml-2 pl-3 border-l border-slate-200">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                title="Klik foto profil untuk opsi akun"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Avatar'}
                    className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border-2 border-emerald-500">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Popover Card (Displayed ONLY when clicked) */}
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 z-50 flex flex-col gap-3 text-left">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-800 truncate flex items-center gap-1">
                          {user.displayName || 'Pengguna'}
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        </span>
                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                      </div>
                    </div>

                    {currentAccessTime && (
                      <div className="text-[11px] bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Akses Terakhir</span>
                        <span className="font-semibold text-slate-700">{currentAccessTime.split(',')[0]}</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      title="Keluar dari Akun Google"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200 transition-all cursor-pointer mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <button 
            className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} 
            id="hamburgerBtn" 
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU & OVERLAY */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`} 
        id="mobileOverlay" 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`} id="mobileMenu">
        <div id="mobileNavContainer">
          {/* User Info Header in Mobile Menu */}
          <div className="p-4 bg-slate-100 rounded-2xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.displayName || 'Akun Google'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="nav-links-mobile" id="mobileNavLinks">
            <a 
              className={activePage === 'beranda' ? 'active' : ''} 
              data-page="beranda" 
              onClick={() => navigateTo('beranda')}
            >
              Beranda
            </a>
            <a 
              className={activePage === 'tentang' ? 'active' : ''} 
              data-page="tentang" 
              onClick={() => navigateTo('tentang')}
            >
              Tentang
            </a>
            <a 
              className={activePage === 'gallery' ? 'active' : ''} 
              data-page="gallery" 
              onClick={() => navigateTo('gallery')}
            >
              Gallery
            </a>
            <a 
              className={activePage === 'contact' ? 'active' : ''} 
              data-page="contact" 
              onClick={() => navigateTo('contact')}
            >
              Kontak
            </a>
            <button 
              className="btn-nav-mobile" 
              id="openModalBtnMobile" 
              onClick={() => { setIsMobileMenuOpen(false); handleOpenModal(); }}
            >
              <i className="fas fa-paper-plane"></i> Kirim Pesan
            </button>
          </div>
        </div>
      </div>

      {/* PAGE SECTION: BERANDA */}
      <section className={`page-section ${activePage === 'beranda' ? 'active' : ''}`} id="beranda">
        <div className="container">
          {/* Active Verified User Banner */}
          <div className="mb-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-blue-100 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Foto Profil" className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover shadow-sm shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center border-2 border-emerald-500 shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{user.displayName || 'Pengguna Google'}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Akun Terverifikasi
                  </span>
                </div>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>

            {currentAccessTime && (
              <div 
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs text-slate-600 font-medium"
              >
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Waktu Akses</span>
                  <span className="font-bold text-slate-700">{currentAccessTime}</span>
                </div>
              </div>
            )}
          </div>

          <div id="berandaContent">
            {loading ? (
              <div className="loading-indicator">Memuat data...</div>
            ) : fetchError ? (
              <div className="loading-indicator">Gagal memuat data Beranda</div>
            ) : allData?.beranda ? (
              <div className="hero-carousel">
                <h1 className="hero-title">
                  <span className="hero-title-marquee">{sanitize(allData.beranda.title || getPageTitle())}</span>
                </h1>
                <div className="hero-content">
                  <div className="hero-text">
                    <div className="subtitle-wrapper">
                      {getSubtitles().map((sub, idx) => (
                        <p key={idx} className={idx === 0 ? "subtitle-heading" : "subtitle-paragraph"}>
                          {sanitize(sub)}
                        </p>
                      ))}
                    </div>
                    {allData.beranda.experience && (
                      <p style={{ marginTop: '18px', fontSize: '1rem', color: '#475569' }}>
                        <i className="fas fa-code" style={{ color: '#2563eb' }}></i> {sanitize(allData.beranda.experience)}
                      </p>
                    )}
                  </div>
                  <div className="hero-image">
                  <div 
                    className="carousel-container" 
                    id="carouselContainer"
                    onMouseEnter={stopAutoPlay}
                    onMouseLeave={startAutoPlay}
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.changedTouches[0].screenX;
                      stopAutoPlay();
                    }}
                    onTouchEnd={(e) => {
                      const touchEndX = e.changedTouches[0].screenX;
                      const diff = touchStartXRef.current - touchEndX;
                      if (Math.abs(diff) > 30) {
                        if (diff > 0) goToSlide(carouselIndex + 1);
                        else goToSlide(carouselIndex - 1);
                      }
                      startAutoPlay();
                    }}
                  >
                    <div 
                      className="carousel-slides" 
                      id="carouselSlides" 
                      style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                    >
                      {heroImages.map((imgUrl, idx) => (
                        <div className="carousel-slide" data-index={idx} key={idx}>
                          <img 
                            src={imgUrl} 
                            alt={`Slide ${idx + 1}`} 
                            loading={idx === 0 ? 'eager' : 'lazy'} 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>

                    {heroImages.length > 1 && (
                      <>
                        <button 
                          className="carousel-btn prev" 
                          id="carouselPrev" 
                          aria-label="Previous slide"
                          onClick={(e) => { e.stopPropagation(); goToSlide(carouselIndex - 1); }}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <button 
                          className="carousel-btn next" 
                          id="carouselNext" 
                          aria-label="Next slide"
                          onClick={(e) => { e.stopPropagation(); goToSlide(carouselIndex + 1); }}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                        <div className="carousel-dots" id="carouselDots">
                          {heroImages.map((_, idx) => (
                            <button 
                              key={idx}
                              className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`}
                              data-index={idx}
                              aria-label={`Slide ${idx + 1}`}
                              onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                            ></button>
                          ))}
                        </div>
                        <div className="carousel-badge">{heroImages.length} foto</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="loading-indicator">Gagal memuat data Beranda</div>
            )}
          </div>
        </div>
      </section>

      {/* PAGE SECTION: TENTANG */}
      <section className={`page-section ${activePage === 'tentang' ? 'active' : ''}`} id="tentang">
        <div className="container">
          <div id="tentangContent">
            {loading ? (
              <div className="loading-indicator">Memuat data...</div>
            ) : fetchError ? (
              <div className="loading-indicator">Gagal memuat data Tentang</div>
            ) : allData?.tentang ? (
              <div className="about-container">
                {allData.tentang.title && <h2 className="about-title">{sanitize(allData.tentang.title)}</h2>}
                <div className="about-grid">
                  <div className="about-desc">
                    {allData.tentang.name && (
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                        {sanitize(allData.tentang.name)}
                      </h3>
                    )}
                    {allData.tentang.location && (
                      <p><i className="fas fa-map-pin" style={{ color: '#2563eb' }}></i> {sanitize(allData.tentang.location)}</p>
                    )}
                    <div className="description-wrapper">
                      {getDescriptions().map((desc, idx) => (
                        <p key={idx}>{sanitize(desc)}</p>
                      ))}
                    </div>
                    {allData.tentang.skills && <p><strong>Keahlian:</strong> {sanitize(allData.tentang.skills)}</p>}
                    {allData.tentang.achievement && (
                      <p><i className="fas fa-award" style={{ color: '#2563eb' }}></i> {sanitize(allData.tentang.achievement)}</p>
                    )}
                  </div>
                  {allData.tentang.image_url && (
                    <div className="about-img">
                      <img src={sanitize(allData.tentang.image_url)} alt="foto owner" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="loading-indicator">Gagal memuat data Tentang</div>
            )}
          </div>
        </div>
      </section>

      {/* PAGE SECTION: GALLERY */}
      <section className={`page-section ${activePage === 'gallery' ? 'active' : ''}`} id="gallery">
        <div className="container">
          <h2 className="section-title"><span>Dokumentasi</span> · resmi belajar</h2>
          <div id="galleryContent">
            {loading ? (
              <div className="loading-indicator">Memuat data..</div>
            ) : fetchError ? (
              <div className="loading-indicator">Gagal memuat data Gallery</div>
            ) : allData?.gallery && Array.isArray(allData.gallery) && allData.gallery.length > 0 ? (
              <div className="gallery-grid">
                {allData.gallery.map((item, idx) => (
                  <div 
                    className="skill-card" 
                    key={idx}
                    onClick={() => {
                      if (item.link) {
                        window.open(item.link, '_blank');
                      }
                    }}
                  >
                    <i 
                      className={sanitize(item.icon || 'fas fa-code')} 
                      style={{ color: sanitize(item.color || '#2563eb') }}
                    ></i>
                    {item.name && <h4>{sanitize(item.name)}</h4>}
                    {item.desc && <p>{sanitize(item.desc)}</p>}
                    <span className="card-link">
                      <i className="fas fa-arrow-right"></i> Pelajari
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading-indicator">Gagal memuat data Gallery</div>
            )}
          </div>
        </div>
      </section>


      {/* PAGE SECTION: CONTACT */}
      <section className={`page-section ${activePage === 'contact' ? 'active' : ''}`} id="contact">
        <div className="container">
          <h2 className="section-title"><span>Hubungi</span> Kami</h2>
          <div id="contactContent">
            {loading ? (
              <div className="loading-indicator">Memuat data...</div>
            ) : fetchError ? (
              <div className="loading-indicator">Gagal memuat data Contact</div>
            ) : allData?.contact ? (
              <div className="contact-wrap">
                <div className="contact-left">
                  {allData.contact.email && (
                    <div className="contact-item">
                      <i className="fas fa-envelope"></i>
                      <span className="contact-text">{sanitize(allData.contact.email)}</span>
                    </div>
                  )}
                  {allData.contact.phone && (
                    <div className="contact-item">
                      <i className="fas fa-phone-alt"></i>
                      <span className="contact-text">{sanitize(allData.contact.phone)}</span>
                    </div>
                  )}
                  {allData.contact.address && (
                    <div className="contact-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span className="contact-text">{sanitize(allData.contact.address)}</span>
                    </div>
                  )}
                </div>
                {allData.contact.map_url && (
                  <div className="contact-right">
                    <iframe 
                      src={sanitize(allData.contact.map_url)} 
                      allowFullScreen 
                      loading="lazy"
                      title="Lokasi Kami"
                    ></iframe>
                  </div>
                )}
              </div>
            ) : (
              <div className="loading-indicator">Gagal memuat data Contact</div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container" id="footerContent">
          {loading ? (
            <div className="loading-indicator">Memuat data...</div>
          ) : fetchError ? (
            <div className="loading-indicator">Gagal memuat data Footer</div>
          ) : allData?.footer ? (
            <div className="footer-content">
              {allData.footer.copyright && (
                <div>&copy; {sanitize(allData.footer.copyright)}</div>
              )}
              {getSocialLinks().length > 0 && (
                <div className="footer-social">
                  {getSocialLinks().map((link) => (
                    <a 
                      href={sanitize(link.url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      key={link.key}
                    >
                      <i className={socialIconMap[link.key] || 'fas fa-link'}></i>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="loading-indicator">Gagal memuat data Footer</div>
          )}
        </div>
      </footer>

      {/* MODAL FORM */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} id="modalForm">
        <div className="modal-box">
          <div className="modal-header">
            <h2><i className="fas fa-paper-plane"></i> Kirim Pesan</h2>
            <button className="close-modal" id="closeModalBtn" onClick={handleCloseModal}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex flex-wrap gap-2 items-center">
              <span className="flex items-center gap-1 font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                <i className="fas fa-fire text-orange-600"></i> Firebase Firestore
              </span>
              <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                <i className="fas fa-database text-blue-600"></i> Cloud Realtime
              </span>
              <span className="text-slate-500">Pesan dan foto terkirim langsung &amp; tersimpan aman di Firestore Database.</span>
            </div>
            <form id="contactForm" onSubmit={handleSubmit}>
              <label>Nama Lengkap <span className="required">*</span></label>
              <input 
                type="text" 
                id="nama" 
                placeholder="Masukkan nama lengkap" 
                required 
                value={formValues.nama}
                onChange={(e) => handleInputChange('nama', e.target.value)}
                onBlur={() => handleInputBlur('nama')}
              />
              <div className={`error-msg ${formErrors.nama ? 'show' : ''}`} id="namaError">
                Nama harus diisi (min 2 huruf).
              </div>

              <label>Email <span className="required">*</span></label>
              <input 
                type="email" 
                id="email" 
                placeholder="email@contoh.com" 
                required 
                value={formValues.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleInputBlur('email')}
              />
              <div className={`error-msg ${formErrors.email ? 'show' : ''}`} id="emailError">
                Email tidak valid.
              </div>

              <label>Telepon <span className="required">*</span></label>
              <input 
                type="tel" 
                id="telpon" 
                placeholder="082199992754" 
                required 
                value={formValues.telpon}
                onChange={(e) => handleInputChange('telpon', e.target.value)}
                onBlur={() => handleInputBlur('telpon')}
              />
              <div className={`error-msg ${formErrors.telpon ? 'show' : ''}`} id="telponError">
                {telponErrorMessage}
              </div>

              <label>Alamat <span className="required">*</span></label>
              <input 
                type="text" 
                id="alamat" 
                placeholder="Jl. Contoh No. 1" 
                required 
                value={formValues.alamat}
                onChange={(e) => handleInputChange('alamat', e.target.value)}
                onBlur={() => handleInputBlur('alamat')}
              />
              <div className={`error-msg ${formErrors.alamat ? 'show' : ''}`} id="alamatError">
                Alamat harus diisi.
              </div>

              <label>Pesan <span className="required">*</span></label>
              <textarea 
                id="pesan" 
                placeholder="Tulis pesan Anda di sini..." 
                required
                value={formValues.pesan}
                onChange={(e) => handleInputChange('pesan', e.target.value)}
                onBlur={() => handleInputBlur('pesan')}
              ></textarea>
              <div className={`error-msg ${formErrors.pesan ? 'show' : ''}`} id="pesanError">
                Pesan minimal 5 karakter.
              </div>

              <label>Upload Foto</label>
              {!previewImageUrl ? (
                <div 
                  className={`upload-area ${isDragOver ? 'dragover' : ''}`} 
                  id="uploadArea"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                  <div className="upload-text">
                    <strong>Klik</strong> atau seret foto ke sini<br />
                    <small style={{ color: '#94a3b8' }}>Format: JPG, JPEG, PNG (max 2MB)</small>
                  </div>
                </div>
              ) : (
                <div className="upload-preview" id="uploadPreview" style={{ display: 'block' }}>
                  <img id="previewImage" src={previewImageUrl} alt="Preview" />
                  <button type="button" className="remove-image" id="removeImageBtn" onClick={clearFile}>
                    ✕
                  </button>
                </div>
              )}
              <input 
                type="file" 
                id="fileInput" 
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,image/jpeg,image/png" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className={`error-msg ${formErrors.file ? 'show' : ''}`} id="fileError">
                {fileErrorMessage}
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button 
              type="submit" 
              className="btn-submit" 
              id="submitBtn" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {!isSubmitting ? (
                <span id="btnText"><i className="fas fa-check-circle"></i> Kirim Pesan</span>
              ) : (
                <span id="btnLoading">
                  <span className="spinner"></span> Sabar Menunggu......
                </span>
              )}
              <span 
                className="loading-progress" 
                id="loadingProgress" 
                style={{ width: `${progress}%` }}
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* BACK TO TOP BUTTON */}
      <button 
        className={`back-to-top ${showBackToTop ? 'show' : ''}`} 
        id="backToTopBtn" 
        aria-label="Back to top"
        onClick={handleScrollToTop}
      >
        <i className="fas fa-arrow-up"></i>
      </button>
    </>
  );
}
