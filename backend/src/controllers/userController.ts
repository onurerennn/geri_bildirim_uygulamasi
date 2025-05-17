import { Request, Response as ExpressResponse } from 'express';
import * as bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { UserRole } from '../types/UserRole';
import { Response as SurveyResponse } from '../models';
import mongoose from 'mongoose';
import { User as UserModel, Response as ResponseModel, Business } from '../models';
import { IResponse } from '../models/Response';

// Kullanıcıları listele
export const getUsers = async (req: Request, res: ExpressResponse) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcılar listelenirken bir hata oluştu.' });
    }
};

// Kullanıcı detayını getir
export const getUser = async (req: Request, res: ExpressResponse) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı getirilirken bir hata oluştu.' });
    }
};

// Müşteri profilini getir
export const getUserProfile = async (req: Request, res: ExpressResponse) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı oturumu bulunamadı'
            });
        }

        console.log('Kullanıcı profili alınıyor, ID:', req.user._id);

        // Kullanıcı bilgilerini al ve tamamlanan anketleri populate et
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate({
                path: 'completedSurveys',
                select: 'title description rewardPoints createdAt'
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        console.log('Kullanıcı profili bulundu:', {
            id: user._id,
            name: user.name,
            points: user.points || 0
        });

        // Kullanıcının yanıtladığı tüm anketleri getir (detaylı bilgilerle)
        const allResponses = await SurveyResponse.find({
            $or: [
                { customer: req.user._id },
                { 'customer._id': req.user._id },
                { userId: req.user._id }
            ]
        })
            .populate({
                path: 'survey',
                select: 'title description'
            })
            .sort({ createdAt: -1 });

        console.log('Kullanıcı anket yanıtları bulundu:', allResponses.length);

        // Yanıtları durumlarına göre filtrele
        const approvedResponses = allResponses.filter((response: IResponse) => response.pointsApproved === true);
        const pendingResponses = allResponses.filter((response: IResponse) => response.pointsApproved === null);
        const rejectedResponses = allResponses.filter((response: IResponse) => response.pointsApproved === false);

        console.log('Yanıt durumları:', {
            onaylı: approvedResponses.length,
            beklemede: pendingResponses.length,
            reddedilmiş: rejectedResponses.length
        });

        // Eğer hiç yanıt bulunamadıysa, daha geniş bir arama yap
        if (allResponses.length === 0) {
            console.log("İlk sorguda yanıt bulunamadı. Ek sorgular deneniyor...");

            // Kullanıcı adı ve e-posta ile arama yap
            const additionalResponses = await SurveyResponse.find({
                $or: [
                    { customerName: user.name },
                    { customerEmail: user.email }
                ]
            }).populate({
                path: 'survey',
                select: 'title description'
            }).sort({ createdAt: -1 });

            console.log(`İsim/email ile yapılan aramada ${additionalResponses.length} yanıt bulundu`);

            // Yeni bulunan yanıtları ekle
            if (additionalResponses.length > 0) {
                // Zaten var olan ID'leri kontrol et ve tekrarı önle
                const existingIds = allResponses.map(r => r._id.toString());
                const newResponses = additionalResponses.filter(r => !existingIds.includes(r._id.toString()));

                allResponses.push(...newResponses);

                // Yanıtları tekrar filtrele
                const allApprovedResponses = allResponses.filter((response: IResponse) => response.pointsApproved === true);
                const allPendingResponses = allResponses.filter((response: IResponse) => response.pointsApproved === null);
                const allRejectedResponses = allResponses.filter((response: IResponse) => response.pointsApproved === false);

                // Güncellenen durumları log'a yaz
                console.log('Genişletilmiş arama sonrası yanıt durumları:', {
                    onaylı: allApprovedResponses.length,
                    beklemede: allPendingResponses.length,
                    reddedilmiş: allRejectedResponses.length
                });

                // Güncellenen durumları kullan
                if (allApprovedResponses.length > 0) approvedResponses.push(...allApprovedResponses);
                if (allPendingResponses.length > 0) pendingResponses.push(...allPendingResponses);
                if (allRejectedResponses.length > 0) rejectedResponses.push(...allRejectedResponses);
            }
        }

        // Son bir deneme - tüm yanıtları sorgula ve kullanıcı ile ilişkili olanları bul
        if (allResponses.length === 0) {
            console.log("Hala yanıt bulunamadı. Tüm yanıtları tarıyoruz...");

            try {
                // Tüm yanıtları getir (limitsiz)
                const allSystemResponses = await SurveyResponse.find()
                    .populate({
                        path: 'survey',
                        select: 'title description'
                    });

                console.log(`Sistemde toplamda ${allSystemResponses.length} yanıt bulundu. Kullanıcı ile eşleşenler aranıyor...`);

                // String karşılaştırması için kullanıcı ID'sini al
                const userIdStr = req.user._id.toString();

                // Karşılaştırma için basit fonksiyon
                const nameMatches = (name1: string, name2: string): boolean => {
                    if (!name1 || !name2) return false;
                    return name1.toLowerCase().includes(name2.toLowerCase()) ||
                        name2.toLowerCase().includes(name1.toLowerCase());
                };

                // Her yanıtı kontrol et
                for (const resp of allSystemResponses) {
                    let matched = false;
                    let reason = '';

                    // 1. UserId ile eşleşme
                    if (resp.userId && resp.userId.toString() === userIdStr) {
                        matched = true;
                        reason = 'userId eşleşti';
                    }
                    // 2. Customer ile eşleşme (Object ID)
                    else if (resp.customer) {
                        if (typeof resp.customer === 'object' && resp.customer?._id &&
                            resp.customer._id.toString() === userIdStr) {
                            matched = true;
                            reason = 'customer._id eşleşti';
                        }
                        // String customer ID ile eşleşme
                        else if (typeof resp.customer === 'string' && resp.customer === userIdStr) {
                            matched = true;
                            reason = 'customer (string) eşleşti';
                        }
                    }
                    // 3. İsim veya email ile eşleşme
                    else if ((resp.customerName && nameMatches(resp.customerName, user.name)) ||
                        (resp.customerEmail && nameMatches(resp.customerEmail, user.email))) {
                        matched = true;
                        reason = 'isim/email eşleşti';
                    }

                    // Eşleşme varsa yanıtı ekle
                    if (matched) {
                        console.log(`Yanıt ID: ${resp._id} kullanıcı ile eşleşti (${reason}).`);

                        // Tekrarları önlemek için ID kontrolü
                        if (!allResponses.some(r => r._id.toString() === resp._id.toString())) {
                            allResponses.push(resp);

                            // Onay durumuna göre ilgili listeye ekle
                            if (resp.pointsApproved === true) {
                                approvedResponses.push(resp);
                            } else if (resp.pointsApproved === null) {
                                pendingResponses.push(resp);
                            } else if (resp.pointsApproved === false) {
                                rejectedResponses.push(resp);
                            }
                        }
                    }
                }

                console.log(`Tüm yanıtlar tarandı ve ${allResponses.length} yanıt bulundu.`);
                console.log('Son yanıt durumları:', {
                    onaylı: approvedResponses.length,
                    beklemede: pendingResponses.length,
                    reddedilmiş: rejectedResponses.length
                });
            } catch (error) {
                console.error("Yanıt taraması sırasında hata:", error);
            }
        }

        // Daha detaylı loglama yaparak yanıt durumlarını kontrol edelim
        if (allResponses.length > 0) {
            // İlk birkaç yanıtın durumlarını kontrol et
            const sampleSize = Math.min(3, allResponses.length);
            console.log(`İlk ${sampleSize} yanıtın durumlarını kontrol ediyorum:`);

            for (let i = 0; i < sampleSize; i++) {
                const resp = allResponses[i];
                console.log(`Yanıt #${i + 1} (${resp._id}):`, {
                    pointsApproved: resp.pointsApproved,
                    veriTipi: typeof resp.pointsApproved,
                    _null_mu: resp.pointsApproved === null,
                    _true_mu: resp.pointsApproved === true,
                    _false_mu: resp.pointsApproved === false
                });
            }
        }

        // Onaylanan tüm yanıtlardan gelen puanların toplamını hesapla
        const totalApprovedPoints = approvedResponses.reduce((total, resp) =>
            total + (resp.rewardPoints || 0), 0);

        // Bekleyen yanıtlardan gelecek potansiyel puanları hesapla
        const potentialPendingPoints = pendingResponses.reduce((total, resp) =>
            total + (resp.rewardPoints || 0), 0);

        // Kullanıcı puanlarını güncelle (eğer veritabanındaki değer farklıysa)
        if (user.points !== totalApprovedPoints) {
            console.log('Kullanıcı puanları güncellenecek:', {
                eski: user.points || 0,
                yeni: totalApprovedPoints
            });

            try {
                // Kullanıcı puanlarını güncelle
                await User.findByIdAndUpdate(
                    user._id,
                    { points: totalApprovedPoints }
                );

                // user nesnesini de güncelle
                user.points = totalApprovedPoints;
                console.log('Kullanıcı puanları güncellendi:', totalApprovedPoints);
            } catch (updateError) {
                console.error('Puan güncellenirken hata:', updateError);
                // Hatayı yut, işleme devam et
            }
        }

        // Kullanıcı ve yanıt bilgilerini döndür
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    ...user.toObject(),
                    points: totalApprovedPoints, // Hesaplanan değeri doğrudan kullan
                    totalApprovedPoints,
                    potentialPendingPoints
                },
                responses: approvedResponses,
                pendingResponses: pendingResponses,
                rejectedResponses: rejectedResponses
            }
        });
    } catch (error: any) {
        console.error('Profil getirme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Profil bilgileri getirilirken bir hata oluştu',
            error: error.message
        });
    }
};

// İşletmeye ait tüm müşterileri getir
export const getBusinessCustomers = async (req: Request, res: ExpressResponse) => {
    try {
        const { businessId } = req.params;

        // İşletme ID kontrolü
        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir işletme ID\'si gereklidir'
            });
        }

        // İşletmeye ait müşterileri bul
        // 1. Bu işletmeye yanıt veren tüm benzersiz müşteri ID'lerini bul
        const responses = await SurveyResponse.find({ business: businessId });

        // Kayıtlı tüm müşteri ID'lerini topla
        const customerIds = new Set<string>();

        // İlk olarak customer alanına kayıtlı olanları ekle
        responses.forEach((response: IResponse) => {
            if (response.customer) {
                customerIds.add((response.customer as any).toString());
            }
        });

        // Bu kullanıcıların detaylarını getir
        const customers = await User.find({
            _id: { $in: Array.from(customerIds) },
            role: UserRole.CUSTOMER
        }).select('-password');

        // Müşterilerin anket yanıtları ve puanları ile birlikte dön
        const customersWithDetails = await Promise.all(
            customers.map(async (customer) => {
                // Müşterinin yanıtladığı anketleri bul
                const customerResponses = await SurveyResponse.find({
                    customer: customer._id,
                    business: businessId
                })
                    .populate({
                        path: 'survey',
                        select: 'title description'
                    })
                    .sort({ createdAt: -1 });

                return {
                    _id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    points: customer.points || 0,
                    completedSurveys: customer.completedSurveys || [],
                    responses: customerResponses
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: customersWithDetails
        });

    } catch (error: any) {
        console.error('Müşteri listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Müşteri listesi getirilirken bir hata oluştu',
            error: error.message
        });
    }
};

// Kullanıcının ödül puanlarını güncelle
export const updateRewardPoints = async (req: Request, res: ExpressResponse) => {
    try {
        const { userId } = req.params;
        const { points, operation } = req.body;

        // Kullanıcı ID ve puan kontrolü
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir kullanıcı ID\'si gereklidir'
            });
        }

        if (points === undefined || isNaN(Number(points))) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir puan değeri gereklidir'
            });
        }

        // Kullanıcıyı bul
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Puanları güncelle (ekle, çıkar veya değiştir)
        const numPoints = Number(points);

        if (operation === 'add') {
            user.points = (user.points || 0) + numPoints;
        } else if (operation === 'subtract') {
            user.points = Math.max(0, (user.points || 0) - numPoints); // Negatif olmasını engelle
        } else {
            // Değiştir
            user.points = numPoints;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Kullanıcı puanları başarıyla güncellendi',
            data: {
                userId: user._id,
                name: user.name,
                currentPoints: user.points
            }
        });

    } catch (error: any) {
        console.error('Puan güncelleme hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Kullanıcı puanları güncellenirken bir hata oluştu',
            error: error.message
        });
    }
};

// Yeni kullanıcı oluştur
export const createUser = async (req: Request, res: ExpressResponse) => {
    try {
        const { name, email, password, role } = req.body;

        // E-posta kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
        }

        // Rol kontrolü
        const requestingUser = req.user as IUser;
        if (requestingUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }

        if (requestingUser.role === UserRole.BUSINESS_ADMIN && role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }

        const user = new User({
            name,
            email,
            password,
            role,
            points: 0, // Başlangıç puanı
            completedSurveys: [], // Boş tamamlanmış anketler listesi
            business: role === UserRole.BUSINESS_ADMIN ? req.body.business : undefined
        });

        await user.save();
        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', user });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
};

// Kullanıcı güncelle
export const updateUser = async (req: Request, res: ExpressResponse) => {
    try {
        const { name, email, role, isActive } = req.body;
        const userId = req.params.id;

        // Kullanıcı kontrolü
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Rol kontrolü
        const requestingUser = req.user as IUser;
        if (requestingUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin rolü atama yetkiniz yok.' });
        }

        if (requestingUser.role === UserRole.BUSINESS_ADMIN && role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolü atayabilirsiniz.' });
        }

        // E-posta değişikliği varsa kontrol et
        if (email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        if (role === UserRole.BUSINESS_ADMIN) {
            user.business = req.body.business;
        }

        await user.save();
        res.json({ message: 'Kullanıcı başarıyla güncellendi.', user });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı güncellenirken bir hata oluştu.' });
    }
};

// Kullanıcı sil
export const deleteUser = async (req: Request, res: ExpressResponse) => {
    try {
        const userId = req.params.id;
        const requestingUser = req.user as IUser;

        // Kullanıcı kontrolü
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Rol kontrolü
        if (requestingUser.role === UserRole.BUSINESS_ADMIN && user.role !== UserRole.CUSTOMER) {
            return res.status(403).json({ message: 'Sadece müşteri rolündeki kullanıcıları silebilirsiniz.' });
        }

        if (user.role === UserRole.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Super Admin kullanıcıları silinemez.' });
        }

        await User.findByIdAndDelete(userId);
        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcı silinirken bir hata oluştu.' });
    }
};

const getFinishedSurveysForUser = async (req: Request, res: ExpressResponse) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Kullanıcı kimliği bulunamadı' });
        }

        // Get all completed surveys for this user
        const completedResponses = await ResponseModel.find({
            $or: [
                { userId: userId },
                { 'customer._id': userId.toString() }
            ]
        })
            .populate('survey', 'title description rewardPoints')
            .populate('business', 'name')
            .sort({ createdAt: -1 });

        // Map the results to a more friendly format
        const formattedResponses = completedResponses.map((response: IResponse) => {
            const responseObj = response.toObject();
            // ... diğer kodlar
            return {
                _id: responseObj._id,
                // ... diğer alanlar
            };
        });

        // ... diğer kodlar
    } catch (error) {
        // ... hata yönetimi
    }
}; 