import apiService from './api';
import { Survey, SurveyResponse } from '../types/Survey';

export interface CreateSurveyData {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    questions: {
        text: string;
        type: 'rating' | 'text' | 'multiple_choice';
        options?: string[];
        required: boolean;
    }[];
}

export interface QRCode {
    _id: string;
    code: string;
    surveyId: string;
    businessId: string;
    url: string;
    surveyTitle?: string;
    createdAt: string;
    updatedAt: string;
}

export const surveyService = {
    getActiveSurveys: async (): Promise<Survey[]> => {
        try {
            console.log('Calling API for active surveys...');
            const response = await apiService.get('/surveys/active');
            console.log('API response:', response.data);

            // Handle the response format
            if (response.data) {
                // If response has the structure with success, message, and data fields
                if (response.data.hasOwnProperty('success') && response.data.hasOwnProperty('data')) {
                    console.log('Using API response format with success/data fields');

                    // Check if data is an array
                    if (Array.isArray(response.data.data)) {
                        return response.data.data;
                    } else {
                        // If data is not an array but success is true, return empty array
                        if (response.data.success) {
                            console.log('API returned success but data is not an array, returning empty array');
                            return [];
                        }
                        // If success is false, handle error
                        else {
                            console.error('API returned error:', response.data.message);
                            throw new Error(response.data.message || 'Unknown error');
                        }
                    }
                }
                // For backward compatibility - if response is a direct array
                else if (Array.isArray(response.data)) {
                    console.log('Using legacy API response format (direct array)');
                    return response.data;
                }
            }

            // Default to empty array if format is unexpected
            console.log('Unexpected API response format, returning empty array');
            return [];
        } catch (error) {
            console.error('Error in getActiveSurveys:', error);
            throw error;
        }
    },

    getSurvey: async (id: string): Promise<Survey> => {
        try {
            console.log(`🔍 Anket detayları getiriliyor, ID: ${id}`);
            const response = await apiService.get(`/surveys/${id}`);

            // Anket verilerini kontrol et
            if (response.data) {
                // Başlık kontrolü - eğer başlık yoksa veya denemedeneme/Yanıt Formu ise temizle
                if (!response.data.title || response.data.title === 'denemedeneme' || response.data.title === 'Yanıt Formu') {
                    console.warn(`⚠️ Anket (${id}) için geçersiz başlık tespit edildi: "${response.data.title || 'boş'}"`);

                    // Alternatif başlık bulma denemeleri
                    if (response.data._id) {
                        response.data.title = `Anket #${response.data._id.substring(0, 8)}`;
                        console.log(`🔄 Anket başlığı düzeltildi: "${response.data.title}"`);
                    }
                } else {
                    console.log(`✅ Anket detayları alındı: "${response.data.title}"`);
                }

                // Açıklama kontrolü
                if (!response.data.description) {
                    response.data.description = 'Bu anket için açıklama bulunmamaktadır.';
                }

                // Soruları kontrol et
                if (!response.data.questions || !Array.isArray(response.data.questions) || response.data.questions.length === 0) {
                    console.warn(`⚠️ Anket (${id}) için soru bulunamadı`);
                } else {
                    console.log(`📋 Anket ${response.data.questions.length} adet soru içeriyor`);
                }
            } else {
                console.warn(`⚠️ Anket (${id}) için API yanıtı boş`);
            }

            return response.data;
        } catch (error: any) {
            console.error(`❌ Anket detayları alınırken hata: ${error.message}`);

            // Hata durumunda minimum bir anket nesnesi oluştur
            const fallbackSurvey: Partial<Survey> = {
                _id: id,
                title: `Anket #${id.substring(0, 8)}`,
                description: 'Anket detaylarına erişilemiyor.',
                questions: [],
                isActive: false
            };

            console.log(`🆘 Hata sonrası yedek anket nesnesi oluşturuldu: ${fallbackSurvey.title}`);
            throw error;
        }
    },

    submitResponse: async (surveyId: string, responseData: SurveyResponse): Promise<any> => {
        try {
            console.log(`📝 Anket yanıtı gönderiliyor: ${surveyId}`);
            console.log('Gönderilecek veri:', JSON.stringify(responseData, null, 2));

            // Backend'in tam olarak istediği veri formatını oluştur
            const formattedAnswers = responseData.answers.map(answer => ({
                question: answer.questionId || answer.question, // Backend "question" alanını bekliyor
                value: answer.value
            }));

            // İşletme ID'sini düzgün formatta hazırla
            let businessId = responseData.business;
            // Eğer business bir nesne ise, sadece ID'sini al
            if (typeof businessId === 'object' && businessId !== null) {
                businessId = (businessId as any)._id || (businessId as any).id || '';
            } else if (businessId === undefined || businessId === null) {
                // Eğer business ID tanımlı değilse, survey ID'yi kullan (genellikle aynı işletmeye ait)
                const surveyIdParts = surveyId.split('-');
                // İlk kısım genellikle business ID'dir
                businessId = surveyIdParts[0] || surveyId;
            }

            // Backend'in beklediği formata uyan veri
            const requestData = {
                survey: surveyId, // Backend'in beklediği alan
                answers: formattedAnswers,
                customer: responseData.customer || { // Customer bilgisi
                    name: 'Belirtilmemiş Müşteri',
                    email: ''
                },
                business: businessId // İşletme ID'si
            };

            // Veri kontrolü
            if (!requestData.survey) {
                throw new Error('Anket ID bulunamadı');
            }

            if (!Array.isArray(requestData.answers) || requestData.answers.length === 0) {
                throw new Error('Yanıtlar boş olamaz');
            }

            // API isteği için tam URL
            const apiUrl = `${window.location.origin.replace(':3000', ':5000')}/api/surveys/${surveyId}/responses`;
            console.log('API URL:', apiUrl);
            console.log('Backend\'e gönderilecek veri:', JSON.stringify(requestData, null, 2));

            // Direct fetch API call with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
                    },
                    body: JSON.stringify(requestData),
                    credentials: 'include',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                let result;
                try {
                    result = await response.json();
                } catch (error) {
                    if (!response.ok) {
                        throw new Error(`Sunucu hatası: ${response.status}`);
                    }
                    throw error;
                }

                if (!response.ok || (result && result.success === false)) {
                    const errorMsg = result?.message || `Sunucu hatası: ${response.status}`;
                    throw new Error(errorMsg);
                }

                console.log('Yanıt gönderme sonucu:', result);
                return result;
            } catch (fetchError: any) {
                if (fetchError.name === 'AbortError') {
                    throw new Error('İstek zaman aşımına uğradı - sunucu yanıt vermedi');
                }
                throw fetchError;
            }

        } catch (error: any) {
            console.error('❌ Yanıt gönderirken hata:', error);
            if (error.response) {
                console.error('❌ Yanıt durumu:', error.response.status);
                console.error('❌ Yanıt verileri:', error.response.data);
            }
            throw error;
        }
    },

    // İşletme yöneticileri için ek metodlar
    createSurvey: async (data: CreateSurveyData): Promise<Survey> => {
        // Deneyeceğimiz endpoint listesi - öncelik sırasına göre
        const endpoints = [
            '/business/surveys',        // İşletmeye özel API
            '/business/create-survey',  // Alternatif işletme API'si
            '/business/surveys/debug',  // Debug modu
            '/surveys/create',          // Debug modu - ana API
            '/surveys',                 // Ana anket API'si
        ];

        let lastError = null;
        let attempts = 0;

        console.log('📣 Anket oluşturma işlemi başlatılıyor...');

        // Her endpointi sırayla dene
        for (const endpoint of endpoints) {
            attempts++;
            try {
                console.log(`�� Anket oluşturma isteği - Endpoint: ${endpoint} (Deneme ${attempts}/${endpoints.length})`);

                // Tarihleri kontrol et ve düzelt
                const surveyData = { ...data };

                if (surveyData.startDate instanceof Date) {
                    surveyData.startDate = new Date(surveyData.startDate.toISOString());
                }

                if (surveyData.endDate instanceof Date) {
                    surveyData.endDate = new Date(surveyData.endDate.toISOString());
                }

                // API isteğini gönder
                const response = await apiService.post(endpoint, surveyData);
                console.log(`✅ Anket başarıyla oluşturuldu (${endpoint}):`, response.data);

                // Başarı durumunda sonucu döndür
                return response.data.survey || response.data;
            } catch (error: any) {
                lastError = error;

                // Hata loglaması - detaylı bilgi
                console.error(`❌ Endpoint ${endpoint} başarısız:`, error.message);

                if (error.response) {
                    console.error(`Durum kodu: ${error.response.status}, mesaj:`,
                        error.response.data?.error || error.response.data?.message || 'Bilinmeyen hata');

                    // Yanıt verisini eksiksiz logla
                    console.log('Yanıt verisi:', error.response.data);

                    // Yetkisiz erişim hatası durumunda hemen çık (yetkilendirilmemiş kullanıcı)
                    if (error.response.status === 401) {
                        console.error('Yetkilendirme hatası, diğer endpointleri denemiyoruz');
                        throw new Error('Bu işlemi yapmak için giriş yapmalısınız. ' +
                            (error.response.data?.message || ''));
                    }

                    // İzin hatası - son endpointte değilsek devam et
                    if (error.response.status === 403) {
                        console.warn('Yetki hatası, bir sonraki endpointi deniyoruz...');
                        continue;
                    }
                }

                // Son endpoint değilse bir sonraki endpointi dene
                if (attempts < endpoints.length) {
                    console.log(`Yeni endpoint deneniyor... (${attempts}/${endpoints.length})`);
                } else {
                    console.error('⚠️ Tüm endpointler denendi, hepsi başarısız');
                }
            }
        }

        // Tüm endpointler başarısız olduysa, son hatayı fırlat
        throw lastError || new Error('Tüm anket oluşturma denemeleri başarısız oldu. Lütfen daha sonra tekrar deneyin.');
    },

    updateSurvey: async (id: string, data: Partial<Survey>): Promise<Survey> => {
        const response = await apiService.put(`/surveys/${id}`, data);
        return response.data;
    },

    deleteSurvey: async (id: string): Promise<void> => {
        await apiService.delete(`/surveys/${id}`);
    },

    getSurveyResponses: async (surveyId: string): Promise<SurveyResponse[]> => {
        try {
            console.log(`🔍 Anket yanıtları getiriliyor, ID: ${surveyId}`);
            const response = await apiService.get(`/surveys/${surveyId}/responses`);
            console.log(`✅ ${response.data.length} adet yanıt alındı`);

            // Yanıtları detaylı olarak logla
            console.log('HAM API YANITI (getSurveyResponses):', JSON.stringify(response.data, null, 2));

            // İlk yanıtı ayrıntılı incele (varsa)
            if (response.data && response.data.length > 0) {
                console.log('İLK YANIT DETAYI:', JSON.stringify(response.data[0], null, 2));

                // Müşteri bilgilerini kontrol et
                if (response.data[0].customer) {
                    console.log('MÜŞTERİ BİLGİSİ:', JSON.stringify(response.data[0].customer, null, 2));
                }
            }

            // Önce anketin kendisini getir ve başlığını al
            console.log('🔍 Anket başlığını getiriliyor...');
            try {
                const surveyData = await surveyService.getSurvey(surveyId);
                if (surveyData && surveyData._id && surveyData.title) {
                    console.log(`✅ Anket başlığı alındı: "${surveyData.title}"`);

                    // Başlığı tüm yanıtlara enjekte et
                    if (Array.isArray(response.data)) {
                        response.data.forEach(resp => {
                            if (resp && resp.survey) {
                                // Eğer başlık yoksa, yanlışsa veya Yanıt Formu ise değiştir
                                if (!resp.survey.title || resp.survey.title === 'Yanıt Formu' || resp.survey.title === 'denemedeneme') {
                                    resp.survey.title = surveyData.title;
                                    console.log(`✅ Yanıt başlığı düzeltildi: "${resp.survey.title}"`);
                                }
                            } else if (resp) {
                                // survey nesnesi yoksa oluştur
                                resp.survey = {
                                    _id: surveyId,
                                    title: surveyData.title,
                                    description: surveyData.description || ''
                                };
                                console.log('⚠️ Yanıtta survey nesnesi yoktu, oluşturuldu');
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn('⚠️ Anket verisi getirilemedi:', err);
            }

            return response.data;
        } catch (error: any) {
            console.error(`❌ Anket yanıtları alınırken hata: ${error.message}`);
            throw error;
        }
    },

    getBusinessSurveys: async (): Promise<Survey[]> => {
        try {
            console.log('📊 İşletmeye ait anketler getiriliyor...');

            // Logları daha detaylı hale getirelim
            let businessId = null;
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    businessId = userData.business;
                    console.log('🧪 Kullanıcı bilgileri:', {
                        id: userData._id,
                        email: userData.email,
                        role: userData.role,
                        business: businessId
                    });
                } else {
                    console.warn('⚠️ LocalStorage\'da user bilgisi bulunamadı!');
                }
            } catch (err: any) {
                console.error('❌ LocalStorage okuma hatası:', err);
            }

            if (!businessId) {
                console.error('❌ Business ID bulunamadı, anketler getirilemez');
                return [];
            }

            // Business ID formatını temizle - "_business" son eki varsa kaldır
            if (typeof businessId === 'string' && businessId.includes('_business')) {
                businessId = businessId.replace('_business', '');
                console.log(`⚠️ Business ID formatı düzeltildi: ${businessId}`);
            }

            // Sadece gerçek API endpoint'ini kullan - business ID'yi doğrudan URL'e ekle
            try {
                console.log(`🔍 İşletme ID: ${businessId} için anketler getiriliyor...`);
                // Business ID'yi doğrudan URL'de belirtiyoruz
                const endpoint = `/surveys/business/${businessId}`;
                const response = await apiService.get(endpoint);

                // API yanıtını kontrol et
                if (response && response.data) {
                    console.log(`✅ Başarılı yanıt alındı:`, response.data);

                    // Veriyi normalize et
                    let surveys: Survey[] = [];

                    // Yeni API yanıt formatı: {success: true, data: [...]}
                    if (response.data?.success === true && Array.isArray(response.data.data)) {
                        console.log('✅ Yeni API yanıt formatı algılandı (success/data)');
                        surveys = response.data.data;
                    }
                    // Yanıtın doğrudan bir dizi olması durumu
                    else if (Array.isArray(response.data)) {
                        console.log('✅ Eski API yanıt formatı algılandı (doğrudan dizi)');
                        surveys = response.data;
                    }
                    // surveys altındaki dizi
                    else if (response.data?.surveys && Array.isArray(response.data.surveys)) {
                        console.log('✅ Alternatif API yanıt formatı algılandı (surveys nesnesi)');
                        surveys = response.data.surveys;
                    }
                    // Tek bir anket objesi
                    else if (response.data && response.data._id) {
                        console.log('✅ Tek anket objesi algılandı');
                        surveys = [response.data];
                    }
                    // Diğer olası formatlar - veri yapısını inceleyerek debug et
                    else {
                        console.warn('⚠️ Beklenmeyen API yanıt formatı, detaylı inceleniyor:',
                            Object.keys(response.data));

                        // Olası anket verisini içeren alanlara bak
                        if (response.data?.data && typeof response.data.data === 'object') {
                            console.log('Muhtemel data alanı bulundu:', typeof response.data.data);

                            if (Array.isArray(response.data.data)) {
                                surveys = response.data.data;
                                console.log('✅ data alanından dizi alındı:', surveys.length);
                            } else if (response.data.data._id) {
                                surveys = [response.data.data];
                                console.log('✅ data alanından tek anket alındı');
                            }
                        }
                    }

                    console.log(`📋 ${surveys.length} adet anket bulundu`);

                    // Sonuçları logla (eğer varsa)
                    if (surveys.length > 0) {
                        console.log('Bulunan anketler:', surveys.map(s => ({
                            id: s._id,
                            title: s.title,
                        })));
                    }

                    return surveys;
                }
            } catch (error: any) {
                console.error(`❌ API isteği başarısız:`, error.message);

                // Hata detaylarını logla
                if (error.response) {
                    console.error(`Yanıt durum kodu: ${error.response.status}`,
                        error.response.data ?
                            `Yanıt: ${JSON.stringify(error.response.data).substring(0, 200)}` :
                            'Yanıt verisi yok'
                    );
                }

                // API hatalarını ilet
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw error;
                }
            }

            // Veri bulunamadıysa boş dizi döndür
            console.log('Anket bulunamadı veya API isteği başarısız oldu, boş dizi döndürülüyor');
            return [];

        } catch (error: any) {
            console.error('❌ İşletme anketleri getirilirken hata:', error);
            throw error;
        }
    },

    generateQRCode: async (surveyId: string): Promise<{ url: string }> => {
        const response = await apiService.post(`/surveys/${surveyId}/qrcode`);
        return response.data;
    },

    getSurveyQRCodes: async (surveyId: string): Promise<QRCode[]> => {
        try {
            console.log(`🔍 Anket ID: ${surveyId} için QR kodları getiriliyor...`);
            const response = await apiService.get(`/surveys/qr/survey/${surveyId}`);
            console.log('QR kod yanıtı:', response.data);

            // Yanıt formatını normalize et
            let qrCodes: QRCode[] = [];

            // Yanıt success/data formatında mı?
            if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('success')) {
                console.log('API yanıtı success/data formatında');
                if (response.data.success && Array.isArray(response.data.data)) {
                    qrCodes = response.data.data;
                }
            }
            // Doğrudan dizi mi?
            else if (Array.isArray(response.data)) {
                console.log('API yanıtı doğrudan dizi formatında');
                qrCodes = response.data;
            }
            // Tek bir QR kod nesnesi mi?
            else if (response.data && response.data._id) {
                console.log('API yanıtı tek bir QR kod nesnesi');
                qrCodes = [response.data];
            }

            // Her zaman bir dizi döndür, boş bile olsa
            console.log(`✅ ${qrCodes.length} adet QR kod bulundu`);
            return qrCodes;
        } catch (error) {
            console.error('❌ QR kodları getirme hatası:', error);
            return []; // Hata durumunda boş dizi döndür
        }
    },

    // İşletmeye ait tüm yanıtları getir
    getBusinessResponses: async (businessId: string): Promise<any[]> => {
        try {
            console.log(`🔍 İşletme yanıtları getiriliyor, ID: ${businessId}`);
            const response = await apiService.get(`/surveys/business/${businessId}/responses`);
            console.log('API yanıtı durum kodu:', response.status);

            // Yanıt formatını normalize et
            let responses: any[] = [];

            // Yanıt success/data formatında mı?
            if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('success')) {
                console.log('API yanıtı success/data formatında');
                if (response.data.success && Array.isArray(response.data.data)) {
                    responses = response.data.data;
                }
            }
            // Doğrudan dizi mi?
            else if (Array.isArray(response.data)) {
                console.log('API yanıtı doğrudan dizi formatında');
                responses = response.data;
            }

            console.log(`✅ ${responses.length} adet yanıt alındı`);

            // ÇOK ÖNEMLİ: ÖNCE TÜM ANKETLERİ AL VE BAŞLIK HARİTASI OLUŞTUR
            console.log('📊 Yanıtlarda geçen anket başlıklarını düzeltmek için anketler getiriliyor...');
            let surveyTitleMap: Record<string, string> = {};

            try {
                const allSurveys = await surveyService.getBusinessSurveys();
                if (Array.isArray(allSurveys)) {
                    allSurveys.forEach(survey => {
                        if (survey && survey._id && survey.title) {
                            surveyTitleMap[survey._id] = survey.title;
                        }
                    });
                }
                console.log(`🔍 ${Object.keys(surveyTitleMap).length} adet anket başlığı haritaya eklendi`);
            } catch (err) {
                console.warn('⚠️ Anketleri getirirken hata oluştu, başlık düzeltme devre dışı:', err);
            }

            // YANIT VERİLERİNDEKİ BAŞLIKLARI DÜZELT
            if (Object.keys(surveyTitleMap).length > 0) {
                console.log('🔄 Yanıt verileri içindeki anket başlıkları düzeltiliyor...');
                responses.forEach(resp => {
                    if (resp && resp.survey && resp.survey._id && surveyTitleMap[resp.survey._id]) {
                        // Eğer başlık "Yanıt Formu" veya "denemedeneme" ise ya da boşsa düzelt
                        if (!resp.survey.title || resp.survey.title === 'Yanıt Formu' || resp.survey.title === 'denemedeneme') {
                            const originalTitle = resp.survey.title;
                            resp.survey.title = surveyTitleMap[resp.survey._id];
                            console.log(`✅ Yanıt (${resp._id}) için başlık düzeltildi: "${originalTitle}" -> "${resp.survey.title}"`);
                        }
                    } else if (resp && resp.survey && resp.survey._id) {
                        // Haritada bulunamayan anketler için direkt API'den getir
                        console.log(`⚠️ Yanıt (${resp._id}) için haritada başlık bulunamadı, ID: ${resp.survey._id}`);

                        // Asenkron işlem başlat - her anketi direk ID'den getir
                        (async () => {
                            try {
                                const survey = await surveyService.getSurvey(resp.survey._id);
                                if (survey && survey.title) {
                                    const originalTitle = resp.survey.title || 'Yanıt Formu';
                                    resp.survey.title = survey.title;
                                    console.log(`✅ Yanıt (${resp._id}) için doğrudan anketten başlık alındı: "${originalTitle}" -> "${resp.survey.title}"`);

                                    // Haritaya da ekleyelim ki diğer yanıtlarda da kullanılsın
                                    surveyTitleMap[resp.survey._id] = survey.title;
                                }
                            } catch (err) {
                                console.warn(`⚠️ ${resp.survey._id} ID'li anket getirilemedi:`, err);
                            }
                        })();
                    }
                });
            } else {
                // Harita oluşturulamadıysa en azından direkt anket istekleri yapalım
                console.log('⚠️ Anket başlık haritası oluşturulamadı, her yanıt için doğrudan API isteği yapılacak');

                // Promis dizisi oluşturup tüm istekleri tamamlayabiliriz
                const titleFetchPromises: Promise<void>[] = [];

                responses.forEach(resp => {
                    if (resp && resp.survey && resp.survey._id) {
                        if (!resp.survey.title || resp.survey.title === 'Yanıt Formu' || resp.survey.title === 'denemedeneme') {
                            const promise = (async () => {
                                try {
                                    const survey = await surveyService.getSurvey(resp.survey._id);
                                    if (survey && survey.title) {
                                        const originalTitle = resp.survey.title || 'Yanıt Formu';
                                        resp.survey.title = survey.title;
                                        console.log(`✅ Yanıt (${resp._id}) için doğrudan anketten başlık alındı: "${originalTitle}" -> "${resp.survey.title}"`);
                                    }
                                } catch (err) {
                                    console.warn(`⚠️ ${resp.survey._id} ID'li anket getirilirken hata:`, err);
                                }
                            })();
                            titleFetchPromises.push(promise);
                        }
                    }
                });

                // Tüm anket başlıklarının çekilmesini bekleyelim (opsiyonel)
                if (titleFetchPromises.length > 0) {
                    try {
                        await Promise.allSettled(titleFetchPromises);
                        console.log(`✅ ${titleFetchPromises.length} anket için başlık çekme işlemi tamamlandı`);
                    } catch (err) {
                        console.warn('⚠️ Bazı anket başlıkları getirilemedi:', err);
                    }
                }
            }

            return responses;
        } catch (error: any) {
            console.error(`❌ İşletme yanıtları alınırken hata: ${error.message}`);
            throw error;
        }
    },

    // Helper function to get a survey title by ID - new helper function
    getSurveyTitle: async (surveyId: string): Promise<string | null> => {
        try {
            console.log(`🔍 Anket başlığı getiriliyor, ID: ${surveyId}`);
            // Try to get from cache first (to implement later)

            // Get from API
            const survey = await surveyService.getSurvey(surveyId);
            if (survey && survey.title) {
                console.log(`✅ Anket başlığı alındı: "${survey.title}"`);
                return survey.title;
            }
            return null;
        } catch (error: any) {
            console.error(`❌ Anket başlığı alınırken hata: ${error.message}`);
            return null;
        }
    },
};

export default surveyService;