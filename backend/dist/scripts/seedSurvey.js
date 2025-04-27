"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
dotenv.config();
const seedSurvey = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/feedback-app');
        console.log('MongoDB bağlantısı başarılı');
        const testSurvey = {
            title: 'Müşteri Memnuniyet Anketi',
            description: 'Hizmetlerimizi değerlendirmeniz için lütfen anketi doldurun.',
            questions: [
                {
                    text: 'Hizmet kalitemizi nasıl değerlendirirsiniz?',
                    type: 'rating',
                    required: true
                },
                {
                    text: 'Eklemek istediğiniz görüşleriniz nelerdir?',
                    type: 'text',
                    required: false
                }
            ],
            isActive: true,
            startDate: new Date(),
            business: '65f2f7c1e584d05a5958e2e1', // İşletme ID'sini kendi veritabanınızdaki bir işletme ID'si ile değiştirin
            createdBy: '65f2f7c1e584d05a5958e2e0' // Kullanıcı ID'sini kendi veritabanınızdaki bir kullanıcı ID'si ile değiştirin
        };
        const existingSurvey = yield models_1.Survey.findOne({ title: testSurvey.title });
        if (existingSurvey) {
            console.log('Test anketi zaten mevcut, güncelleniyor...');
            Object.assign(existingSurvey, testSurvey);
            yield existingSurvey.save();
            console.log('Test anketi güncellendi');
        }
        else {
            console.log('Yeni test anketi oluşturuluyor...');
            yield models_1.Survey.create(testSurvey);
            console.log('Test anketi oluşturuldu');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
});
seedSurvey();
