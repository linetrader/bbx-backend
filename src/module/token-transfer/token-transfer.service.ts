import { ethers } from 'ethers';

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import privateKeysJson from '../../../privateKey.json'; // JSON 파일 읽기
import { WalletsService } from '../wallets/wallets.service';

// JSON 파일의 타입 정의
const privateKeys: Record<string, string> = privateKeysJson;

@Injectable()
export class TokenTransferService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly companyUsdtWalletAddress: string;
  private readonly companyBnbWalletAddress: string;
  private readonly bscUsdtContractAddress: string;

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
  }

  async transferUsdt(userId: string, totalPrice: number): Promise<boolean> {
    const wallet = await this.walletsService.findWalletById(userId);

    if (!wallet) {
      throw new BadRequestException('Wallet not found for the given user ID.');
    }

    const walletId = wallet.id;

    if (!(walletId in privateKeys)) {
      throw new BadRequestException('Private key not found for the wallet.');
    }

    const privateKey = privateKeys[walletId]; // 안전하게 접근
    const walletAddress = wallet.address;
    const usdtBalance = await this.getUsdtBalance(walletAddress);

    console.log('transferUsdt - privateKey', privateKey);
    console.log('transferUsdt - walletAddress', walletAddress);
    console.log('transferUsdt - usdtBalance', usdtBalance);

    if (usdtBalance < totalPrice) {
      throw new BadRequestException('Insufficient USDT balance.');
    }

    const bnbBalance = await this.getBnbBalance(walletAddress);

    //console.log('transferUsdt - bnbBalance', bnbBalance);

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
      console.log(`[INFO] BNB Balance for ${address}: ${balanceInEther} BNB`);
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

    // 최신 ethers에서 Wallet 생성
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
      console.log(
        `[INFO] Successfully transferred ${amount} BNB to ${toAddress}`,
      );
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to transfer BNB:', error);
      return false;
    }
  }
}
