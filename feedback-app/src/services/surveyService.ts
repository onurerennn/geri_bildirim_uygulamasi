import api from './api';
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
            const response = await api.get('/surveys/active');
            console.log('API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error in getActiveSurveys:', error);
            throw error;
        }
    },

    getSurvey: async (id: string): Promise<Survey> => {
        try {
            console.log(`🔍 Anket detayları getiriliyor, ID: ${id}`);
            const response = await api.get(`/surveys/${id}`);
            console.log(`✅ Anket detayları alındı: ${response.data?.title || 'İsimsiz anket'}`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Anket detayları alınırken hata: ${error.message}`);
            throw error;
        }
    },

    submitResponse: async (surveyId: string, responseData: SurveyResponse): Promise<any> => {
        try {
            console.log(`📝 Anket yanıtı gönderiliyor: ${surveyId}`);
            const response = await api.post(`/surveys/${surveyId}/responses`, responseData);
            console.log(`✅ Anket yanıtı başarıyla gönderildi`);
            return response.data;
        } catch (error: any) {
            // Tekrarlanan yanıt hatası mı kontrol et
            if (error.response?.data?.message?.includes('duplicate key error') ||
                error.response?.status === 409 ||
                error.message?.includes('E11000')) {
                console.error('❌ Daha önce bu ankete yanıt vermişsiniz');
                throw new Error('Bu ankete daha önce yanıt verdiniz. Aynı ankete birden fazla kez yanıt veremezsiniz.');
            }

            // Diğer API hataları
            if (error.response?.data?.message) {
                console.error(`❌ Anket yanıtı gönderilirken hata: ${error.response.data.message}`);
                throw new Error(error.response.data.message);
            }

            // Genel hata durumu
            console.error(`❌ Anket yanıtı gönderilirken hata: ${error.message}`);
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
                console.log(`📤 Anket oluşturma isteği - Endpoint: ${endpoint} (Deneme ${attempts}/${endpoints.length})`);

                // Tarihleri kontrol et ve düzelt
                const surveyData = { ...data };

                if (surveyData.startDate instanceof Date) {
                    surveyData.startDate = new Date(surveyData.startDate.toISOString());
                }

                if (surveyData.endDate instanceof Date) {
                    surveyData.endDate = new Date(surveyData.endDate.toISOString());
                }

                // API isteğini gönder
                const response = await api.post(endpoint, surveyData);
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
        const response = await api.put(`/surveys/${id}`, data);
        return response.data;
    },

    deleteSurvey: async (id: string): Promise<void> => {
        await api.delete(`/surveys/${id}`);
    },

    getSurveyResponses: async (surveyId: string): Promise<SurveyResponse[]> => {
        try {
            console.log(`🔍 Anket yanıtları getiriliyor, ID: ${surveyId}`);
            const response = await api.get(`/surveys/${surveyId}/responses`);
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
                const response = await api.get(endpoint);

                // API yanıtını kontrol et
                if (response && response.data) {
                    console.log(`✅ Başarılı yanıt alındı:`, response.data);

                    // Veriyi normalize et
                    let surveys: Survey[] = [];

                    // Yanıtın bir dizi olması durumu
                    if (Array.isArray(response.data)) {
                        surveys = response.data;
                    }
                    // surveys altındaki dizi
                    else if (response.data?.surveys && Array.isArray(response.data.surveys)) {
                        surveys = response.data.surveys;
                    }
                    // Tek bir anket objesi
                    else if (response.data && response.data._id) {
                        surveys = [response.data];
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
        const response = await api.post(`/surveys/${surveyId}/qrcode`);
        return response.data;
    },

    getSurveyQRCodes: async (surveyId: string): Promise<QRCode[]> => {
        try {
            const response = await api.get(`/surveys/qr/survey/${surveyId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching survey QR codes:', error);
            throw error;
        }
    },

    // İşletmeye ait tüm yanıtları getir
    getBusinessResponses: async (businessId: string): Promise<any[]> => {
        try {
            console.log(`🔍 İşletme yanıtları getiriliyor, ID: ${businessId}`);
            const response = await api.get(`/surveys/business/${businessId}/responses`);
            console.log(`✅ ${response.data.length} adet yanıt alındı`);

            // Yanıtları detaylı olarak logla
            console.log('HAM API YANITI (getBusinessResponses):', JSON.stringify(response.data, null, 2));

            // İlk yanıtı ayrıntılı incele (varsa)
            if (response.data && response.data.length > 0) {
                console.log('İLK YANIT DETAYI:', JSON.stringify(response.data[0], null, 2));

                // Müşteri bilgilerini kontrol et
                if (response.data[0].customer) {
                    console.log('MÜŞTERİ BİLGİSİ:', JSON.stringify(response.data[0].customer, null, 2));
                }

                // Sorular ve yanıtları kontrol et
                if (response.data[0].answers) {
                    console.log('YANITLAR:', JSON.stringify(response.data[0].answers, null, 2));
                }

                // Yanıtın anket bilgisini kontrol et
                if (response.data[0].survey) {
                    console.log('ANKET BİLGİSİ:', JSON.stringify(response.data[0].survey, null, 2));
                }
            }

            return response.data;
        } catch (error: any) {
            console.error(`❌ İşletme yanıtları alınırken hata: ${error.message}`);
            throw error;
        }
    },
};

export default surveyService; 