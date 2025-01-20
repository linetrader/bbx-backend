import { ethers } from 'ethers';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs'; // 파일 읽기 모듈
import { resolve } from 'path'; // 경로 모듈
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class TokenTransferService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly companyUsdtWalletAddress: string;
  private readonly companyBnbWalletAddress: string;
  private readonly bscUsdtContractAddress: string;
  private readonly privateKeyFilePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
  ) {
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get<string>('BSC_RPC_URL') || '',
    );
    this.companyUsdtWalletAddress =
      this.configService.get<string>('COMPANY_USDT_WALLET_ADDRESS') || '';
    this.companyBnbWalletAddress =
      this.configService.get<string>('COMPANY_BNB_WALLET_ADDRESS') || '';
    this.bscUsdtContractAddress =
      this.configService.get<string>('BSC_USDT_CONTRACT_ADDRESS') || '';
    this.privateKeyFilePath = resolve(__dirname, '../../../privateKey.json'); // JSON 파일 경로
  }

  // JSON 파일 동적 로드
  private loadPrivateKeys(): Record<string, string> {
    try {
      const fileContent = readFileSync(this.privateKeyFilePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('[ERROR] Failed to load privateKey.json:', error);
      throw new BadRequestException('Failed to load private keys.');
    }
  }

  async transferUsdt(userId: string, totalPrice: number): Promise<boolean> {
    const wallet = await this.walletsService.findWalletById(userId);

    if (!wallet) {
      return false;
    }

    const walletId = wallet.id;
    const privateKeys = this.loadPrivateKeys();

    if (!(walletId in privateKeys)) {
      return false;
    }

    const privateKey = privateKeys[walletId];
    const walletAddress = wallet.address;
    const usdtBalance = await this.getUsdtBalance(walletAddress);

    if (usdtBalance < totalPrice) {
      return false;
    }

    const bnbBalance = await this.getBnbBalance(walletAddress);

    if (bnbBalance < 0.0001) {
      return false;
    }

    const success = await this.sendUsdt(privateKey, totalPrice);

    return success;
  }

  private async getUsdtBalance(address: string): Promise<number> {
    const abi = ['function balanceOf(address _owner) view returns (uint256)'];
    const contract = new ethers.Contract(
      this.bscUsdtContractAddress,
      abi,
      this.provider,
    );

    const balance = await contract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 18));
  }

  async getBnbBalance(address: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(address); // BNB 잔액 가져오기 (Wei 단위)
      const balanceInEther = parseFloat(ethers.formatEther(balance)); // Ether 단위로 변환
      return balanceInEther;
    } catch (error) {
      console.error(
        `[ERROR] Failed to fetch BNB balance for ${address}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch BNB balance.');
    }
  }

  private async sendUsdt(privateKey: string, amount: number): Promise<boolean> {
    const abi = [
      'function transfer(address _to, uint256 _value) returns (bool)',
    ];

    const wallet = new ethers.Wallet(privateKey).connect(this.provider);
    const contract = new ethers.Contract(
      this.bscUsdtContractAddress,
      abi,
      wallet,
    );

    const decimals = 18;
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    try {
      const tx = await contract.transfer(
        this.companyUsdtWalletAddress,
        amountInWei,
      );
      await tx.wait();
      return true;
    } catch (error) {
      console.error('USDT transfer failed:', error);
      return false;
    }
  }

  async transferBnb(toAddress: string, amount: number): Promise<boolean> {
    const walletId = await this.walletsService.findWalletIdByAddress(
      this.companyBnbWalletAddress,
    );

    if (!walletId) {
      throw new BadRequestException('Wallet not found for the given user ID.');
    }

    const privateKeys = this.loadPrivateKeys();

    if (!privateKeys[walletId]) {
      throw new BadRequestException('Company wallet private key not found.');
    }

    const privateKey = privateKeys[walletId];
    const wallet = new ethers.Wallet(privateKey).connect(this.provider);

    const amountInWei = ethers.parseUnits(amount.toString(), 'ether');

    try {
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountInWei,
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to transfer BNB:', error);
      return false;
    }
  }
}
