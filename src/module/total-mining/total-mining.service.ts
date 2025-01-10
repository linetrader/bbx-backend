// module/total-mining/total-mining.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
//import { Cron } from '@nestjs/schedule';
//import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Model } from 'mongoose';
import { TotalMining } from './total-mining.schema';

@Injectable()
export class TotalMiningService {
  private readonly logger = new Logger(TotalMiningService.name);
  private readonly axiosInstance: AxiosInstance;
  private cookies: string | null = null; // 쿠키 저장 변수

  constructor(
    @InjectModel(TotalMining.name)
    private readonly totalMiningModel: Model<TotalMining>,
    //private readonly configService: ConfigService, // ConfigService 주입
  ) {
    //const cronExpression = this.configService.get<string>('CRON_EXPRESSION');
    //console.log('CRON_EXPRESSION from ConfigService:', cronExpression);

    this.axiosInstance = axios.create({
      baseURL: 'https://bitboostx.com', // 사이트 기본 URL
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
    });
  }

  // 매 분마다 실행되는 작업
  //@Cron('0 */1 * * *')
  async handleCron() {
    try {
      //this.logger.debug('Cron job running based on CRON_EXPRESSION from .env');

      // 쿠키가 없거나 만료된 경우 로그인 수행
      if (!this.cookies || !(await this.isCookieValid())) {
        this.logger.log('Cookies are missing or expired. Logging in...');
        await this.login('niabest@gmail.com', 'Hoon4621!@');
      }

      // 마이닝 데이터 크롤링
      const quantity = await this.fetchActiveRigs();
      const miningProfit = await this.fetchMiningProfitability();
      this.logger.log(`Fetched Quantity Data: ${quantity}`);
      this.logger.log(`Fetched Mining Data: ${miningProfit}`);

      // 기존 DB의 최신 miningProfit 가져오기
      const lastMiningRecord = await this.totalMiningModel
        .findOne({}, { miningProfit: 1 })
        .sort({ createdAt: -1 }); // 가장 최근 다큐먼트를 가져옴

      // 변화가 없으면 저장하지 않음
      if (lastMiningRecord && lastMiningRecord.miningProfit === miningProfit) {
        this.logger.log('No change in miningProfit. Skipping save.');
        return;
      }

      // 변화가 있으면 새로운 다큐먼트 저장
      await this.saveMiningData(quantity, miningProfit);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error in scheduled task: ${err.message}`);
    }
  }

  /**
   * 마이닝 데이터를 MongoDB에 저장
   */
  private async saveMiningData(
    quantity: number,
    miningProfit: number,
  ): Promise<void> {
    try {
      const newMiningData = new this.totalMiningModel({
        miningType: 'BTC',
        miningQuantity: quantity,
        miningProfit,
      });

      const result = await newMiningData.save();
      this.logger.log(`Mining data saved to DB: ${JSON.stringify(result)}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to save mining data: ${err.message}`);
    }
  }

  /**
   * 로그인 요청
   * @param username 사용자 이름
   * @param password 비밀번호
   */
  async login(username: string, password: string): Promise<void> {
    try {
      // CSRF 토큰 가져오기
      const { data: loginPageHtml } =
        await this.axiosInstance.get('/my-account/');
      const $ = cheerio.load(loginPageHtml);

      // CSRF 토큰 가져오기 (undefined 방지)
      const csrfTokenRaw = $('input[name="woocommerce-login-nonce"]').val();
      const csrfToken = Array.isArray(csrfTokenRaw)
        ? csrfTokenRaw[0]
        : csrfTokenRaw || '';

      // 로그인 요청 데이터
      const payload = new URLSearchParams({
        username,
        password,
        'woocommerce-login-nonce': csrfToken,
        _wp_http_referer: '/my-account/',
        login: 'Log in',
      });

      // 로그인 요청
      const response = await this.axiosInstance.post(
        '/wp-login.php',
        payload.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // 쿠키 저장
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.cookies = cookies.join('; '); // 쿠키 저장
        this.axiosInstance.defaults.headers.Cookie = this.cookies; // Axios 인스턴스에 쿠키 설정
        this.logger.log('Login successful and cookies saved.');
      } else {
        throw new Error('Failed to retrieve session cookies.');
      }
    } catch (error) {
      const err = error as Error; // 'error'를 'Error' 타입으로 변환
      this.logger.error(`Login failed: ${err.message}`);
      throw new Error(`Login failed: ${err.message}`);
    }
  }

  /**
   * 쿠키 유효성 확인
   */
  private async isCookieValid(): Promise<boolean> {
    try {
      // 보호된 리소스에 테스트 요청
      const response = await this.axiosInstance.get('/register_wallet_yun/');

      // 정상적으로 데이터를 가져왔으면 쿠키는 유효
      return response.status === 200;
    } catch {
      // 인증 실패 시 쿠키가 만료된 것으로 간주
      this.logger.warn('Cookies are invalid or expired.');
      return false;
    }
  }

  async fetchActiveRigs(): Promise<number> {
    try {
      // 대상 페이지의 HTML 가져오기
      const { data } = await axios.get(
        'https://bitboostx.com/register_wallet_yun/',
      );

      // Cheerio로 HTML 파싱
      const $ = cheerio.load(data);

      // Active Rigs 데이터를 포함하는 요소 선택
      const activeRigsText = $('.eael-progressbar-title').text().trim();

      // 숫자 값 추출 (정규식 사용)
      const match = activeRigsText.match(/(\d+)/); // 숫자만 추출
      if (!match) {
        throw new Error('Unable to find Active Rigs count.');
      }

      // 숫자로 변환하여 반환
      return parseInt(match[0], 10);
    } catch (error) {
      const err = error as Error; // 'error'를 'Error' 타입으로 변환
      console.error(`Error fetching Active Rigs: ${err.message}`);
      throw error;
    }
  }

  /**
   * 빨간색 표시된 수익 데이터를 가져옴
   */
  async fetchMiningProfitability(): Promise<number> {
    try {
      // 페이지 데이터 가져오기
      const { data } = await axios.get(
        'https://bitboostx.com/register_wallet_yun/',
      );

      // Cheerio를 사용해 HTML 파싱
      const $ = cheerio.load(data);

      // CSS 선택자를 사용하여 데이터를 가져옴
      const profitabilityText = $('.elementor-element-60b953e p').text().trim();

      // 값이 비어 있으면 예외 처리
      if (!profitabilityText) {
        throw new Error('Unable to find mining profitability data.');
      }

      // 숫자 부분 추출 (정규식 사용)
      const match = profitabilityText.match(/^[\d.]+/); // 문자열의 맨 앞 숫자와 소수점 추출
      if (!match) {
        throw new Error(
          'Unable to extract numerical value from profitability data.',
        );
      }

      // 추출한 숫자 값을 float으로 변환하여 반환
      return parseFloat(match[0]);
    } catch (error) {
      const err = error as Error; // 'error'를 'Error' 타입으로 변환
      console.error(`Error fetching mining profitability: ${err.message}`);
      throw error;
    }
  }
}
