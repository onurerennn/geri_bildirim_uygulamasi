import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Grid,
    Rating,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Divider,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { Survey } from '../types/Survey';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PollIcon from '@mui/icons-material/Poll';
import apiService from '../services/api';
import moment from 'moment';
import CancelIcon from '@mui/icons-material/Cancel';
import DateRangeIcon from '@mui/icons-material/DateRange';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

// Profil veri tipi
interface ProfileData {
    user: {
        _id: string;
        name: string;
        email: string;
        role: string;
        points: number;
        completedSurveys: SurveyInfo[];
        totalApprovedPoints: number;
    };
    responses: ResponseInfo[];        // Onaylanmış yanıtlar
    pendingResponses: ResponseInfo[]; // Onay bekleyen yanıtlar
    rejectedResponses: ResponseInfo[]; // Reddedilmiş yanıtlar
}

// Anket bilgi tipi
interface SurveyInfo {
    _id: string;
    title: string;
    description: string;
    rewardPoints: number;
    createdAt: string;
}

// Yanıt bilgi tipi
interface ResponseInfo {
    _id: string;
    survey: {
        _id: string;
        title: string;
        description: string;
    };
    rewardPoints: number;
    pointsApproved: boolean; // Onay durumu
    createdAt: string;
    updatedRewardPoints?: number; // Güncellenen ödül puanları
    lastPointsUpdate?: string; // Son puan güncelleme tarihi
}

const Customer = () => {
    const { user, updateProfile } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [error, setError] = useState<string>('');
    const [feedback, setFeedback] = useState({
        rating: 0,
        comment: ''
    });
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [tabValue, setTabValue] = useState(1);
    const [qrCodeInput, setQrCodeInput] = useState('');
    const [scanLoading, setScanLoading] = useState(false);
    const [displayPoints, setDisplayPoints] = useState(0);
    const [selectedSurvey, setSelectedSurvey] = useState<null | {
        title: string;
        description: string;
        surveyId: string;
        responseId: string;
        createdAt: string;
        rewardPoints: number;
    }>(null);
    const [viewSurveyOpen, setViewSurveyOpen] = useState(false);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    console.log('Customer component rendered', { user });

    useEffect(() => {
        console.log('Customer component mounted');
        fetchSurveys();
        fetchUserProfile();
    }, [user]);

    // Debug için profil verilerinin durumunu logla
    useEffect(() => {
        if (profileData) {
            console.log('🧑‍💼 Güncel Profil Verileri:', {
                kullanıcı: {
                    id: profileData.user._id,
                    ad: profileData.user.name,
                    puanlar: profileData.user.points || 0
                },
                onaylı: profileData.responses?.length || 0,
                bekleyen: profileData.pendingResponses?.length || 0,
                reddedilen: profileData.rejectedResponses?.length || 0
            });
        }
    }, [profileData]);

    // Tab değiştiğinde profil verilerini güncelle (özellikle 0 tabı - profil sayfası açıldığında)
    useEffect(() => {
        if (tabValue === 0) {
            console.log('👤 Profil tabı seçildi, veriler yenileniyor...');
            fetchUserProfile();
        }
    }, [tabValue]);

    // Yanıt gönderdikten sonra profil bilgilerini güncelle
    const updateProfileAfterAction = () => {
        setTimeout(() => {
            fetchUserProfile();
        }, 500); // Veritabanı güncellemesine zaman tanımak için küçük bir gecikme
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const fetchUserProfile = async () => {
        try {
            setProfileLoading(true);
            const response = await apiService.get('/users/profile');
            console.log('API Yanıtı:', response.data);

            if (response.data && response.data.data) {
                const userData = response.data.data;
                console.log('API response.data.data:', userData);

                // Debug için kullanıcı bilgilerini detaylı logla
                console.log('API Kullanıcı Puanları:', {
                    points: userData.points,
                    totalApprovedPoints: userData.totalApprovedPoints,
                    rolePoints: userData.rolePoints,
                    rewardPoints: userData.rewardPoints
                });

                // Yanıtları alalım ve updatedRewardPoints değerlerini kontrol edelim
                const onaylanmışYanıtlar = userData.responses?.filter((r: any) => r.pointsApproved === true) || [];
                let enGüncelPuan = null;

                // Onaylanmış yanıtlardan en son güncellenen puan değerini alalım
                if (onaylanmışYanıtlar.length > 0) {
                    // Yanıtları son güncellenme tarihine göre sıralayalım
                    const sıralıYanıtlar = [...onaylanmışYanıtlar].sort((a, b) => {
                        const dateA = a.lastPointsUpdate ? new Date(a.lastPointsUpdate).getTime() : 0;
                        const dateB = b.lastPointsUpdate ? new Date(b.lastPointsUpdate).getTime() : 0;
                        return dateB - dateA; // Azalan sıralama (en yeni en üstte)
                    });

                    // En son güncellenen yanıtın updatedRewardPoints değerini alalım
                    for (const yanıt of sıralıYanıtlar) {
                        if (yanıt.updatedRewardPoints !== undefined) {
                            enGüncelPuan = yanıt.updatedRewardPoints;
                            console.log(`✅ En güncel updatedRewardPoints bulundu: ${enGüncelPuan}, yanıt: ${yanıt._id}`);
                            break;
                        }
                    }
                }

                // Puan öncelik sıralaması: 
                // 1. En son güncellenmiş yanıttaki updatedRewardPoints
                // 2. userData.rewardPoints 
                // 3. userData.points 
                // 4. totalApprovedPoints 
                // 5. 0 (varsayılan)
                const userDisplayPoints =
                    enGüncelPuan !== null ? enGüncelPuan :
                        userData.rewardPoints ||
                        userData.points ||
                        userData.totalApprovedPoints ||
                        0;

                console.log('Gösterilecek puan değeri:', userDisplayPoints);
                setDisplayPoints(userDisplayPoints);

                // Puanları global state'e de kaydet - müşterinin context'teki puanlarını güncel tut
                if (userData && typeof updateProfile === 'function') {
                    // Sonsuz döngüyü önlemek için şimdilik doğrudan updateProfile çağrısı yapmıyoruz
                    // ancak kullanıcı context'ini güncelleme işlemini optimize etmek adına
                    // burada AuthContext'teki setUser fonksiyonunu kullanabiliriz
                }

                // Yanıt durumlarını işle
                const bekleyenYanıtlar = userData.responses?.filter((r: any) => r.pointsApproved === null || r.pointsApproved === undefined) || [];
                const reddedilenYanıtlar = userData.responses?.filter((r: any) => r.pointsApproved === false) || [];

                console.log('Yanıt durumları:', {
                    'onaylı': onaylanmışYanıtlar.length,
                    beklemede: bekleyenYanıtlar.length,
                    'reddedilmiş': reddedilenYanıtlar.length
                });

                if (onaylanmışYanıtlar.length > 0) {
                    console.log('İlk onaylı yanıt örneği:', onaylanmışYanıtlar[0]);
                }
                if (reddedilenYanıtlar.length > 0) {
                    console.log('İlk reddedilen yanıt örneği:', reddedilenYanıtlar[0]);
                }

                // ÖNEMLİ: Yanıtlarda "Yanıt Formu" başlıklarını düzelt
                // Tüm anketlerin ID'lerini toplayıp, başlıklarını getir
                const allSurveyIds = [
                    ...onaylanmışYanıtlar.map((r: any) => r.survey?._id).filter(Boolean),
                    ...bekleyenYanıtlar.map((r: any) => r.survey?._id).filter(Boolean),
                    ...reddedilenYanıtlar.map((r: any) => r.survey?._id).filter(Boolean)
                ];

                // Benzersiz anket ID'leri
                const uniqueSurveyIds = Array.from(new Set(allSurveyIds));
                console.log('Benzersiz anket ID sayısı:', uniqueSurveyIds.length);

                // Eğer anket ID'leri varsa
                if (uniqueSurveyIds.length > 0) {
                    try {
                        // Anket başlık haritasını oluştur
                        const surveyTitleMap: Record<string, string> = {};

                        // Mümkünse tüm anketleri getir
                        const allBusinessSurveys = await surveyService.getBusinessSurveys();
                        if (Array.isArray(allBusinessSurveys) && allBusinessSurveys.length > 0) {
                            allBusinessSurveys.forEach(survey => {
                                if (survey && survey._id && survey.title) {
                                    surveyTitleMap[survey._id] = survey.title;
                                }
                            });
                            console.log(`📋 ${Object.keys(surveyTitleMap).length} anket başlığı haritaya eklendi`);

                            // Tüm eksik anket detaylarını getirmek için Promise dizisi oluştur
                            const surveyPromises: Promise<void>[] = [];

                            // Tüm yanıt türlerindeki başlıkları düzelt
                            [onaylanmışYanıtlar, bekleyenYanıtlar, reddedilenYanıtlar].forEach(responseList => {
                                responseList.forEach((response: any) => {
                                    if (response.survey && response.survey._id && surveyTitleMap[response.survey._id]) {
                                        // Eğer başlık yoksa veya "Yanıt Formu" ise düzelt
                                        if (!response.survey.title || response.survey.title === 'Yanıt Formu' || response.survey.title === 'denemedeneme') {
                                            const originalTitle = response.survey.title;
                                            response.survey.title = surveyTitleMap[response.survey._id];
                                            console.log(`✅ Yanıt başlığı düzeltildi: "${originalTitle}" -> "${response.survey.title}"`);
                                        }
                                    } else if (response.survey && response.survey._id) {
                                        // Doğrudan survey ID kullanarak anket detaylarını getir
                                        const promise = (async () => {
                                            try {
                                                console.log(`⚠️ Anketin tam detayları alınıyor: ${response.survey._id}`);
                                                const survey = await surveyService.getSurvey(response.survey._id);
                                                if (survey) {
                                                    // Anket başlığını güncelle
                                                    if (survey.title) {
                                                        const originalTitle = response.survey.title;
                                                        response.survey.title = survey.title;
                                                        console.log(`✅ Anket başlığı güncellendi: "${originalTitle}" -> "${response.survey.title}"`);
                                                    }

                                                    // Anket açıklamasını güncelle
                                                    if (survey.description) {
                                                        response.survey.description = survey.description;
                                                        console.log(`✅ Anket açıklaması eklendi: "${response.survey.description.substring(0, 30)}..."`);
                                                    }

                                                    // Haritaya da ekle ki diğer yanıtlarda kullanılabilsin
                                                    surveyTitleMap[response.survey._id] = survey.title;
                                                }
                                            } catch (err) {
                                                console.warn(`⚠️ ${response.survey._id} ID'li anket getirilemedi:`, err);
                                            }
                                        })();
                                        surveyPromises.push(promise);
                                    }
                                });
                            });

                            // Tüm anket detayı getirme işlemlerinin tamamlanmasını bekle
                            if (surveyPromises.length > 0) {
                                console.log(`⏳ ${surveyPromises.length} anket için detaylar getiriliyor...`);
                                await Promise.all(surveyPromises);
                                console.log('✅ Tüm anket detayları getirildi ve yanıtlara eklendi.');
                            }
                        }
                    } catch (err) {
                        console.warn('⚠️ Anket başlıklarını düzeltme işlemi başarısız:', err);
                    }
                }

                // İşlenmiş profil verileri oluştur
                const profileData: ProfileData = {
                    user: {
                        _id: userData._id,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        points: userData.points || 0,
                        completedSurveys: userData.completedSurveys || [],
                        totalApprovedPoints: userData.totalApprovedPoints || 0,
                    },
                    responses: onaylanmışYanıtlar,
                    pendingResponses: bekleyenYanıtlar,
                    rejectedResponses: reddedilenYanıtlar
                };

                // Yanıtlardan onaylanmış toplam puanları hesapla (API'den gelmiyorsa)
                if (!profileData.user.totalApprovedPoints) {
                    const approvedPoints = onaylanmışYanıtlar.reduce((total: number, resp: ResponseInfo) => {
                        return total + (resp.rewardPoints || 0);
                    }, 0);
                    profileData.user.totalApprovedPoints = approvedPoints;
                    console.log(`✅ Onaylanmış toplam puanlar hesaplandı: ${approvedPoints}`);
                }

                console.log('İşlenmiş profil verileri:', profileData);
                setProfileData(profileData);
            } else {
                setError('Kullanıcı bilgileri alınamadı');
            }
        } catch (error: any) {
            console.error('Profil verileri yüklenirken hata oluştu:', error);
            setError('Profil verileri yüklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
        } finally {
            setProfileLoading(false);
        }
    };

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            setError(''); // Hata durumunu sıfırla
            console.log('Müşteri sayfası: Anketler yükleniyor...');

            try {
                const response = await surveyService.getActiveSurveys();
                console.log('Yüklenen anket verisi:', response);

                if (Array.isArray(response)) {
                    console.log('Yüklenen anket sayısı:', response.length);
                    setSurveys(response);
                } else {
                    console.error('Geçersiz yanıt formatı:', response);
                    setError('Sunucudan geçersiz veri formatı alındı. Yönetici ile iletişime geçin.');
                    setSurveys([]);
                }
            } catch (serviceError: any) {
                console.error('Anket servisi hatası:', serviceError);
                const errorMessage = serviceError.message || 'Anketler yüklenirken bir hata oluştu';
                setError(errorMessage);
                setSurveys([]);
            }
        } catch (error: any) {
            console.error('Error fetching surveys:', error);
            setSurveys([]);
            if (error.response) {
                setError(`Anketler yüklenirken hata: ${error.response.status} - ${error.response.data.message || 'Bilinmeyen hata'}`);
            } else if (error.request) {
                setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                setError(`Anketler yüklenirken bir hata oluştu: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async (surveyId: string) => {
        try {
            setLoading(true);
            setError('');
            console.log('Geri bildirim gönderiliyor...', { surveyId, feedback });

            // Find the current survey by ID
            const currentSurvey = surveys.find(s => s._id === surveyId);
            if (!currentSurvey) {
                setError('Anket bulunamadı');
                setLoading(false);
                return;
            }

            // Make sure there are at least 2 questions in the survey
            if (!currentSurvey.questions || currentSurvey.questions.length < 2) {
                setError('Anket soruları bulunamadı');
                setLoading(false);
                return;
            }

            // Backend'in modellerine uygun veri yapısı
            const responseData = {
                // Backend modeline göre "survey" alanı kullanılmalı
                survey: surveyId,
                answers: [
                    {
                        // Backend modelinde "question" alanını kullanıyoruz
                        question: currentSurvey.questions[0]._id,
                        value: feedback.rating
                    },
                    {
                        question: currentSurvey.questions[1]._id,
                        value: feedback.comment
                    }
                ],

                // Backend'e müşteri bilgisini "customer" alanında gönderiyoruz
                customer: {
                    name: user?.name || 'İsimsiz Müşteri',
                    email: user?.email || ''
                },

                // İşletme ID'si de gerekli
                business: currentSurvey.business
            };

            // Detaylı loglama
            console.log('Gönderilecek anket yanıtı:', JSON.stringify(responseData, null, 2));
            console.log('Hedef anket ID:', surveyId);
            console.log('Yanıt sayısı:', responseData.answers.length);

            await surveyService.submitResponse(surveyId, responseData);
            setSuccessMessage('Geri bildiriminiz için teşekkür ederiz!');
            setFeedback({ rating: 0, comment: '' });
            fetchSurveys(); // Yeni anketleri yükle
            updateProfileAfterAction(); // Profil verilerini güncelle
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            if (error.response) {
                setError(`Geri bildirim gönderilirken hata: ${error.response.status} - ${error.response.data.message || 'Bilinmeyen hata'}`);
            } else if (error.request) {
                setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                setError(`Geri bildirim gönderilirken bir hata oluştu: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleScanQrCode = async () => {
        if (!qrCodeInput.trim()) {
            showSnackbar('Lütfen QR kod ID veya kodu girin', 'error');
            return;
        }

        setScanLoading(true);
        setError('');

        try {
            let code = qrCodeInput.trim();

            // QR kod ID olarak mı yoksa kod olarak mı girdiğini kontrol et
            if (code.length === 24 && /^[0-9a-fA-F]{24}$/.test(code)) {
                // MongoDB ObjectId formatında (24 karakter hex) - QR kod ID'si olarak kabul et
                try {
                    console.log('QR kod ID olarak sorgulanıyor:', code);
                    // QR kod ID'si olarak API'den bilgileri al (format=array parametresi ile array döndürmesini sağla)
                    const qrCodeResponse = await apiService.get(`/surveys/qr/${code}?format=array`);
                    console.log('QR kod yanıtı:', qrCodeResponse.data);

                    // Yeni API response formatını kontrol et (success/data fields)
                    if (qrCodeResponse.data && qrCodeResponse.data.success === true) {
                        // success/data formatı
                        if (qrCodeResponse.data.code) {
                            // Direkt obje formatı
                            code = qrCodeResponse.data.code;
                            console.log('QR kod kodu alındı (obje formatı):', code);
                        } else if (qrCodeResponse.data.data && Array.isArray(qrCodeResponse.data.data) && qrCodeResponse.data.data.length > 0) {
                            // Dizi formatı
                            code = qrCodeResponse.data.data[0].code;
                            console.log('QR kod kodu alındı (dizi formatı):', code);
                        } else {
                            console.log('QR kod yanıtında geçerli veri bulunamadı');
                        }
                    } else {
                        // Eski API response formatı - düz obje
                        if (qrCodeResponse.data && qrCodeResponse.data.code) {
                            code = qrCodeResponse.data.code;
                            console.log('QR kod kodu alındı (eski format):', code);
                        }
                    }
                } catch (err) {
                    console.log('QR kod ID olarak bulunamadı, kod olarak denenecek', err);
                    // Hata aldık, belki bu direkt bir koddur, devam et
                }
            }

            if (!code) {
                throw new Error('Geçerli bir QR kod bulunamadı');
            }

            // Doğrudan kodu kullanarak anket sayfasına yönlendir
            console.log(`Ankete yönlendiriliyor: /survey/code/${code}`);
            navigate(`/survey/code/${code}`);

        } catch (error: any) {
            console.error('QR kod tarama hatası:', error);
            setError('QR kod taranırken bir hata oluştu. Lütfen geçerli bir QR kod girin.');
        } finally {
            setScanLoading(false);
        }
    };

    const handleViewSurveyDetails = (response: ResponseInfo) => {
        if (response.survey) {
            // Detaylı loglama - response nesnesinin içeriğini tam olarak görmek için
            console.log('Yanıt detayları (handleViewSurveyDetails):', {
                responseId: response._id,
                surveyId: response.survey._id,
                title: response.survey.title,
                titleType: response.survey.title ? typeof response.survey.title : 'undefined',
                description: response.survey.description,
                descriptionType: response.survey.description ? typeof response.survey.description : 'undefined',
                rewardPoints: response.rewardPoints,
                createdAt: response.createdAt,
                fullSurveyObject: response.survey
            });

            // Anketi göstermeden önce yükleniyor durumuna geç
            setIsDetailsLoading(true);

            // API'den anket detaylarını getir
            (async () => {
                try {
                    if (response.survey._id) {
                        console.log(`🔍 Anket (${response.survey._id}) için güncel bilgiler getiriliyor...`);
                        const surveyDetails = await surveyService.getSurvey(response.survey._id);

                        if (surveyDetails) {
                            console.log('📋 API\'den alınan güncel anket bilgileri:', {
                                id: surveyDetails._id,
                                title: surveyDetails.title,
                                description: surveyDetails.description,
                                hasQuestions: surveyDetails.questions && surveyDetails.questions.length > 0
                            });

                            // Anket detaylarını kullanarak dialog'u güncelle
                            setSelectedSurvey({
                                title: surveyDetails.title || response.survey.title || 'Anket Detayları',
                                description: surveyDetails.description || response.survey.description || 'Bu anket hakkında detaylı bilgi bulunmamaktadır.',
                                surveyId: response.survey._id,
                                responseId: response._id,
                                createdAt: response.createdAt,
                                rewardPoints: response.rewardPoints || 0
                            });

                            // Dialog'u göster
                            setViewSurveyOpen(true);

                            // Yükleme durumunu kapat
                            setIsDetailsLoading(false);

                            // Kullanıcıya bildirim göster
                            showSnackbar('Anket detayları görüntüleniyor', 'info');
                            return; // API'den başarıyla veri getirildiyse fonksiyonu sonlandır
                        }
                    }

                    // Eğer API'den getiremediyse normal yolla devam et
                    console.warn('⚠️ API\'den anket detayları getirilemedi, yerel verilerle devam ediliyor');
                    setSelectedSurvey({
                        title: response.survey.title || 'Anket Detayları',
                        description: response.survey.description || 'Bu anket hakkında detaylı bilgi bulunmamaktadır.',
                        surveyId: response.survey._id,
                        responseId: response._id,
                        createdAt: response.createdAt,
                        rewardPoints: response.rewardPoints || 0
                    });

                    // Dialog'u göster
                    setViewSurveyOpen(true);

                    // Yükleme durumunu kapat
                    setIsDetailsLoading(false);

                } catch (err) {
                    console.warn('⚠️ Anket detaylarını getirme hatası:', err);

                    // Hata durumunda da en azından yerel veriyi göster
                    setSelectedSurvey({
                        title: response.survey.title || 'Anket Detayları',
                        description: response.survey.description || 'Bu anket hakkında detaylı bilgi bulunmamaktadır.',
                        surveyId: response.survey._id,
                        responseId: response._id,
                        createdAt: response.createdAt,
                        rewardPoints: response.rewardPoints || 0
                    });

                    // Dialog'u göster
                    setViewSurveyOpen(true);

                    // Yükleme durumunu kapat
                    setIsDetailsLoading(false);
                }
            })();
        }
    };

    console.log('Customer component render state', { loading, error, surveysCount: surveys.length });

    if (loading && tabValue === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Müşteri Portalı
            </Typography>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Profilim" icon={<AccountCircleIcon />} iconPosition="start" />
                    <Tab label="Bilgi" />
                    <Tab label="QR Kod Tara" icon={<QrCodeScannerIcon />} iconPosition="start" />
                </Tabs>

                {/* Anket Detayları Dialogu */}
                <Dialog
                    open={viewSurveyOpen}
                    onClose={() => setViewSurveyOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        {isDetailsLoading ? (
                            <Box display="flex" alignItems="center">
                                <CircularProgress size={24} sx={{ mr: 2 }} />
                                <Typography variant="h6">Anket Detayları Yükleniyor...</Typography>
                            </Box>
                        ) : (
                            selectedSurvey?.title || 'Anket Detayları'
                        )}
                    </DialogTitle>
                    <DialogContent>
                        {isDetailsLoading ? (
                            <Box display="flex" justifyContent="center" my={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                <Typography variant="subtitle1" gutterBottom>
                                    Anket Açıklaması:
                                </Typography>
                                <Typography paragraph>
                                    {selectedSurvey?.description || 'Bu anket için açıklama bulunmamaktadır.'}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Box display="flex" alignItems="center">
                                            <EmojiEventsIcon color="primary" sx={{ mr: 1 }} />
                                            <Typography variant="subtitle1">
                                                Kazanılan Puan: <b>{selectedSurvey?.rewardPoints || 0}</b>
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box display="flex" alignItems="center">
                                            <DateRangeIcon color="primary" sx={{ mr: 1 }} />
                                            <Typography variant="subtitle1">
                                                Yanıt Tarihi: <b>{selectedSurvey?.createdAt && new Date(selectedSurvey.createdAt).toLocaleDateString('tr-TR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</b>
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewSurveyOpen(false)} color="primary">
                            Kapat
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Profil Sekmesi */}
                <TabPanel value={tabValue} index={0}>
                    {profileLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                            <CircularProgress />
                        </Box>
                    ) : profileData ? (
                        <Box>
                            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center">
                                        <Avatar sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}>
                                            <AccountCircleIcon sx={{ fontSize: 60 }} />
                                        </Avatar>
                                        <Typography variant="h6">{profileData.user.name}</Typography>
                                        <Typography variant="body2" color="textSecondary">{profileData.user.email}</Typography>

                                        <Box mt={2} textAlign="center">
                                            {/* Toplam puanları göster - gelişmiş görünüm */}
                                            <Paper
                                                elevation={3}
                                                sx={{
                                                    p: 2,
                                                    mb: 2,
                                                    backgroundImage: 'linear-gradient(135deg, #4527a0 10%, #7b1fa2 100%)',
                                                    color: 'white',
                                                    borderRadius: 2,
                                                    boxShadow: '0 8px 16px rgba(123, 31, 162, 0.3)'
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                                    <EmojiEventsIcon sx={{ mr: 2, fontSize: 36, color: '#ffeb3b' }} />
                                                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                                                        {displayPoints}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="subtitle1" align="center" sx={{ fontWeight: 'medium' }}>
                                                    Toplam Puanınız
                                                </Typography>
                                                <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.9 }}>
                                                    Bu puanları ödüller için kullanabilirsiniz
                                                </Typography>
                                            </Paper>

                                            {/* Onay bekleyen puanları göster */}
                                            {profileData.pendingResponses && profileData.pendingResponses.length > 0 && (
                                                <Chip
                                                    icon={<EmojiEventsIcon />}
                                                    label={`${profileData.pendingResponses.reduce((total, resp) => total + (resp.rewardPoints || 0), 0)} Puan (Onay Bekliyor)`}
                                                    color="warning"
                                                    variant="outlined"
                                                    sx={{ fontSize: '1rem', py: 1.5, px: 1, mt: 1, mb: 1 }}
                                                />
                                            )}

                                            {/* Reddedilen puanları göster */}
                                            {profileData.rejectedResponses && profileData.rejectedResponses.length > 0 && (
                                                <Chip
                                                    icon={<CancelIcon />}
                                                    label={`${profileData.rejectedResponses.length} Anket Reddedildi`}
                                                    color="error"
                                                    variant="outlined"
                                                    sx={{ fontSize: '1rem', py: 1.5, px: 1, mt: 1, mb: 1 }}
                                                />
                                            )}

                                            <Grid container spacing={2} sx={{ mt: 2 }}>
                                                <Grid item xs={12}>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        startIcon={<EmojiEventsIcon />}
                                                        onClick={() => setTabValue(0)}
                                                        fullWidth
                                                    >
                                                        Anket Geçmişini Görüntüle
                                                    </Button>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Button
                                                        variant="outlined"
                                                        color="primary"
                                                        onClick={() => setTabValue(2)}
                                                        startIcon={<QrCodeScannerIcon />}
                                                        fullWidth
                                                    >
                                                        Yeni Anket Doldur
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} md={8}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <PollIcon sx={{ mr: 1 }} />
                                            Anket Geçmişi
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />

                                        {/* Onay bekleyen yanıtlar */}
                                        {profileData.pendingResponses && profileData.pendingResponses.length > 0 && (
                                            <>
                                                <Typography variant="subtitle1" gutterBottom color="warning.main" sx={{ mt: 2 }}>
                                                    Onay Bekleyen Yanıtlar
                                                </Typography>
                                                <List>
                                                    {profileData.pendingResponses.map((response) => (
                                                        <Paper
                                                            key={response._id}
                                                            elevation={2}
                                                            onClick={() => handleViewSurveyDetails(response)}
                                                            sx={{
                                                                mb: 2,
                                                                p: 0,
                                                                borderRadius: 2,
                                                                overflow: 'hidden',
                                                                transition: 'all 0.3s ease',
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                                                    transform: 'translateY(-2px)'
                                                                }
                                                            }}
                                                        >
                                                            <Box sx={{ p: 2, borderLeft: '4px solid', borderColor: 'warning.main' }}>
                                                                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                                                    <ListItemAvatar>
                                                                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                                                                            <PollIcon />
                                                                        </Avatar>
                                                                    </ListItemAvatar>
                                                                    <ListItemText
                                                                        primary={
                                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                                <PollIcon color="warning" />
                                                                                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
                                                                                    {response.survey && response.survey.title &&
                                                                                        response.survey.title !== 'Yanıt Formu' &&
                                                                                        response.survey.title !== 'denemedeneme' ? (
                                                                                        response.survey.title
                                                                                    ) : (
                                                                                        response.survey && response.survey._id
                                                                                            ? `Anket #${response.survey._id.substring(0, 8)}`
                                                                                            : 'Anket Detayları'
                                                                                    )}
                                                                                </Typography>
                                                                            </Box>
                                                                        }
                                                                        secondary={
                                                                            <>
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{ mt: 1, color: 'text.secondary' }}
                                                                                >
                                                                                    {response.survey && response.survey.description
                                                                                        ? response.survey.description
                                                                                        : 'Bu anket hakkında açıklama bulunmamaktadır.'}
                                                                                </Typography>
                                                                                <Box
                                                                                    display="flex"
                                                                                    justifyContent="space-between"
                                                                                    alignItems="center"
                                                                                    mt={1}
                                                                                >
                                                                                    <Chip
                                                                                        icon={<EmojiEventsIcon />}
                                                                                        label={`${response.rewardPoints || 0} Puan Bekliyor`}
                                                                                        color="warning"
                                                                                        variant="outlined"
                                                                                        size="small"
                                                                                    />
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {moment(response.createdAt).format('DD.MM.YYYY HH:mm')}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </>
                                                                        }
                                                                    />
                                                                </ListItem>
                                                            </Box>
                                                        </Paper>
                                                    ))}
                                                </List>
                                            </>
                                        )}

                                        {/* Reddedilen yanıtlar */}
                                        {profileData.rejectedResponses && profileData.rejectedResponses.length > 0 && (
                                            <>
                                                <Typography variant="subtitle1" gutterBottom color="error.main" sx={{ mt: 2 }}>
                                                    Reddedilen Yanıtlar
                                                </Typography>
                                                <List>
                                                    {profileData.rejectedResponses.map((response) => (
                                                        <Paper
                                                            key={response._id}
                                                            elevation={2}
                                                            onClick={() => handleViewSurveyDetails(response)}
                                                            sx={{
                                                                mb: 2,
                                                                p: 0,
                                                                borderRadius: 2,
                                                                overflow: 'hidden',
                                                                transition: 'all 0.3s ease',
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                                                    transform: 'translateY(-2px)'
                                                                }
                                                            }}
                                                        >
                                                            <Box sx={{ p: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                                                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                                                    <ListItemAvatar>
                                                                        <Avatar sx={{ bgcolor: 'error.main' }}>
                                                                            <CancelIcon />
                                                                        </Avatar>
                                                                    </ListItemAvatar>
                                                                    <ListItemText
                                                                        primary={
                                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                                <PollIcon color="error" />
                                                                                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
                                                                                    {response.survey && response.survey.title &&
                                                                                        response.survey.title !== 'Yanıt Formu' &&
                                                                                        response.survey.title !== 'denemedeneme' ? (
                                                                                        response.survey.title
                                                                                    ) : (
                                                                                        response.survey && response.survey._id
                                                                                            ? `Anket #${response.survey._id.substring(0, 8)}`
                                                                                            : 'Anket Detayları'
                                                                                    )}
                                                                                </Typography>
                                                                            </Box>
                                                                        }
                                                                        secondary={
                                                                            <>
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{ mt: 1, color: 'text.secondary' }}
                                                                                >
                                                                                    {response.survey && response.survey.description
                                                                                        ? response.survey.description
                                                                                        : 'Bu anket hakkında açıklama bulunmamaktadır.'}
                                                                                </Typography>
                                                                                <Box
                                                                                    display="flex"
                                                                                    justifyContent="space-between"
                                                                                    alignItems="center"
                                                                                    mt={1}
                                                                                >
                                                                                    <Chip
                                                                                        icon={<CancelIcon />}
                                                                                        label="Reddedildi"
                                                                                        color="error"
                                                                                        variant="outlined"
                                                                                        size="small"
                                                                                    />
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {moment(response.createdAt).format('DD.MM.YYYY HH:mm')}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </>
                                                                        }
                                                                    />
                                                                </ListItem>
                                                            </Box>
                                                        </Paper>
                                                    ))}
                                                </List>
                                            </>
                                        )}

                                        {/* Onaylanmış yanıtlar */}
                                        <Typography variant="subtitle1" gutterBottom color="success.main" sx={{ mt: 2 }}>
                                            Tamamlanan Anketler
                                        </Typography>
                                        {profileData.responses && profileData.responses.length > 0 ? (
                                            <List>
                                                {profileData.responses.map((response) => (
                                                    <Paper
                                                        key={response._id}
                                                        elevation={2}
                                                        onClick={() => handleViewSurveyDetails(response)}
                                                        sx={{
                                                            mb: 2,
                                                            p: 0,
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            transition: 'all 0.3s ease',
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                                                transform: 'translateY(-2px)'
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{ p: 2, borderLeft: '4px solid', borderColor: 'success.main' }}>
                                                            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                                                <ListItemAvatar>
                                                                    <Avatar sx={{ bgcolor: 'success.main' }}>
                                                                        <EmojiEventsIcon />
                                                                    </Avatar>
                                                                </ListItemAvatar>
                                                                <ListItemText
                                                                    primary={
                                                                        <Box display="flex" alignItems="center" gap={1}>
                                                                            <PollIcon color="primary" />
                                                                            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
                                                                                {response.survey && response.survey.title &&
                                                                                    response.survey.title !== 'Yanıt Formu' &&
                                                                                    response.survey.title !== 'denemedeneme' ? (
                                                                                    response.survey.title
                                                                                ) : (
                                                                                    response.survey && response.survey._id
                                                                                        ? `Anket #${response.survey._id.substring(0, 8)}`
                                                                                        : 'Anket Detayları'
                                                                                )}
                                                                            </Typography>
                                                                        </Box>
                                                                    }
                                                                    secondary={
                                                                        <>
                                                                            <Typography
                                                                                variant="body2"
                                                                                sx={{ mt: 1, color: 'text.secondary' }}
                                                                            >
                                                                                {response.survey && response.survey.description
                                                                                    ? response.survey.description
                                                                                    : 'Bu anket hakkında açıklama bulunmamaktadır.'}
                                                                            </Typography>
                                                                            <Box
                                                                                display="flex"
                                                                                justifyContent="space-between"
                                                                                alignItems="center"
                                                                                mt={1}
                                                                            >
                                                                                <Chip
                                                                                    icon={<EmojiEventsIcon />}
                                                                                    label={`${response.rewardPoints || 0} Puan`}
                                                                                    color="success"
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                />
                                                                                <Typography variant="caption" color="text.secondary">
                                                                                    {moment(response.createdAt).format('DD.MM.YYYY HH:mm')}
                                                                                </Typography>
                                                                            </Box>
                                                                        </>
                                                                    }
                                                                />
                                                            </ListItem>
                                                        </Box>
                                                    </Paper>
                                                ))}
                                            </List>
                                        ) : (
                                            <Alert severity="info">
                                                Henüz onaylanmış anket yanıtınız bulunmuyor.
                                            </Alert>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <EmojiEventsIcon sx={{ mr: 1 }} />
                                    <Typography variant="h6">Puan Sistemi Hakkında</Typography>
                                </Box>
                                <Typography variant="body1" paragraph>
                                    Her anket cevapladığınızda puanlar kazanırsınız. Bu puanlar işletme tarafından onaylandıktan sonra hesabınıza eklenir ve çeşitli ödüller için kullanabilirsiniz.
                                </Typography>
                                <Typography variant="body2">
                                    Onay bekleyen anketler işletme yöneticisi tarafından değerlendirilmektedir. Onaylanan puanlar hesabınıza otomatik olarak eklenir, reddedilen anketler için puan kazanamazsınız.
                                </Typography>
                            </Paper>
                        </Box>
                    ) : (
                        <Alert severity="warning">
                            Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.
                        </Alert>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
                        <Typography variant="h6" align="center" gutterBottom>
                            Anket Bilgilendirmesi
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Değerli müşterimiz, artık anketlerimize sadece QR kod ID'si girerek erişebilirsiniz.
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Lütfen size verilmiş olan QR kod ID'sini girmek için "QR Kod Tara" sekmesine geçiniz.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setTabValue(2)}
                            startIcon={<QrCodeScannerIcon />}
                            sx={{ mt: 2 }}
                        >
                            QR Kod Giriş Sayfasına Git
                        </Button>
                    </Paper>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h5" gutterBottom>
                            QR Kod ID'si ile Anket Erişimi
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Typography variant="body1" paragraph align="center">
                            Lütfen size verilen QR kod ID'sini aşağıdaki alana giriniz.
                        </Typography>

                        <Box sx={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="QR Kod ID'si"
                                variant="outlined"
                                fullWidth
                                value={qrCodeInput}
                                onChange={(e) => setQrCodeInput(e.target.value)}
                                placeholder="QR kod ID'sini giriniz"
                                sx={{ mb: 2 }}
                            />

                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth
                                onClick={handleScanQrCode}
                                disabled={scanLoading || !qrCodeInput.trim()}
                                startIcon={<QrCodeScannerIcon />}
                                sx={{ py: 1.5 }}
                            >
                                {scanLoading ? 'İşleniyor...' : 'Ankete Eriş'}
                            </Button>
                        </Box>
                    </Paper>
                </TabPanel>
            </Paper>
        </Container>
    );
};

export default Customer; 