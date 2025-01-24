// contracts.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DefaultContract } from './contracts.default.schema';
import { Contract, CreateContractInput } from './contracts.schema';
import { UsersService } from '../users/users.service';
import { GetPendingContractsResponse } from './dto/get-pending-contracts-response.dto';
import { checkAdminAccess, checkUserAuthentication } from '../../utils/utils';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class ContractsService implements OnModuleInit {
  constructor(
    @InjectModel(DefaultContract.name)
    private readonly defaultContractModel: Model<DefaultContract>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<Contract>,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService, // Add MailerService
  ) {}

  async onModuleInit() {
    // 초기화 로직이 주석 처리되어 있음
    this.initializeDefaultContract();
    this.saveContractAsPdf('6789fd34dd6683e327811cca');
  }

  async confirmContract(contractId: string): Promise<boolean> {
    const contractUser = await this.contractModel.findById(contractId).exec();
    if (!contractUser) {
      return false;
    }

    contractUser.status = 'approved';
    await contractUser.save();

    return true;
  }

  async getDefaultContract(): Promise<DefaultContract> {
    const defaultContract = await this.defaultContractModel.findOne().exec();
    if (!defaultContract) {
      throw new NotFoundException('Default contract information not found');
    }
    return defaultContract;
  }

  async getPendingContractsAdmin(
    limit: number,
    offset: number,
    user: { id: string },
  ): Promise<GetPendingContractsResponse[]> {
    await checkAdminAccess(this.usersService, user.id);

    const contracts = await this.contractModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .skip(offset)
      .limit(limit)
      .exec();

    // 추가된 로그
    //console.log('getPendingContractsAdmin contracts:', contracts);

    return Promise.all(
      contracts.map(async (contract) => {
        try {
          const username = await this.usersService.getUserName(contract.userId);
          return {
            id: contract.id,
            username: username || 'Unknown',
            packageName: contract.packageName,
            quantity: contract.quantity,
            totalPrice: contract.totalPrice,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
          };
        } catch (error) {
          console.error(
            'Error fetching username for contract:',
            contract.id,
            error,
          );
          return {
            id: contract.id,
            username: 'Unknown',
            packageName: contract.packageName,
            quantity: contract.quantity,
            totalPrice: contract.totalPrice,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
          };
        }
      }),
    );
  }

  async getTotalPendingContracts(): Promise<number> {
    return this.contractModel.countDocuments({ status: 'pending' }).exec();
  }

  async createContract(input: CreateContractInput): Promise<boolean> {
    try {
      const defaultContract = await this.getDefaultContract();
      const currentDate = new Date().toISOString().split('T')[0];

      const newContract = new this.contractModel({
        ...input,
        content: defaultContract.content,
        date: currentDate,
        companyName: defaultContract.companyName,
        companyAddress: defaultContract.companyAddress,
        businessNumber: defaultContract.businessNumber,
        representative: defaultContract.representative,
      });

      await newContract.save();
      return true;
    } catch (error) {
      console.error('Error creating contract:', error);
      return false;
    }
  }

  async getPackageRecordsByUser(
    user: { id: string },
    status: string,
  ): Promise<Contract[]> {
    checkUserAuthentication(user);

    const userId = user.id;

    const packages = await this.contractModel
      .find({ userId, status })
      .sort({ createdAt: -1 })
      .exec();

    if (!packages.length) {
      throw new BadRequestException('Packages not found.');
    }

    return packages;
  }

  async getApprovedContracts(): Promise<Contract[]> {
    return this.contractModel.find({ status: 'approved' }).exec();
  }

  private async updateMissingStatusFields(): Promise<void> {
    try {
      const packagesWithoutStatus = await this.contractModel
        .find({ status: { $exists: false } })
        .exec();

      if (packagesWithoutStatus.length > 0) {
        console.log(
          `Found ${packagesWithoutStatus.length} packages without status. Updating to 'approved'.`,
        );

        for (const pkg of packagesWithoutStatus) {
          pkg.status = 'approved';
          await pkg.save();
        }

        console.log('All missing status fields have been updated.');
      }
    } catch (error) {
      console.error('Error updating missing status fields:', error);
    }
  }

  async initializeDefaultContract(): Promise<DefaultContract> {
    const exists = await this.defaultContractModel.findOne().exec();
    if (!exists) {
      const defaultContract = new this.defaultContractModel({
        content: [
          `
도지 채굴기 위탁관리 계약서
`,
          `
주식회사 부스트엑스 대표이사 장준태(이하 “갑이라 함)과 _____________(이하 “을”이라 함)는 아래와 같이 도지 채굴기에 대한 위탁 관리 계약을 체결한다.
`,
          `
제1조 목적
본 계약은 “갑”이 소유한 채굴용 컴퓨터에 합의된 용량의 클라우드 서버를 사용하여 ‘을’을 위해 계약기간 동안 도지코인을 채굴하고, 그 대가로 위탁운영비 지급에 것에 관한 권리의무 사항을 정하는 것을 목적으로 한다.
`,
          `
제2조 위탁사항
1)“갑”은 계약기간 동안 정해진 용량의 그래픽카드가 최고의 상태에서 작동할 수 있도록 채굴 컴퓨터의 성능을 유지하여야 하며 도지코인이 최대한 채굴될 수 있도록 선량한 관리자의 주의의무를 다하여야 한다
2)“갑”은 외부의 제3자로부터의 해킹 방지에 노력하여야 한다.
`,
          `
제3조 위탁관리료
1)위탁관리료 430 USDT(테더)이며 계약체결과 동시에 선불로 위탁관리료를 “갑”에게 지급하여야 하며 “갑”은 “을”에게 (15TH) 를 제공한다.
2)”을”이 구입한 해시를 통해 채굴되는 도지코인은 “을”이 85% “갑”이 15%로 분배한다.  
3)위탁관리 기간은 (3년)으로 하며 3년 이후에는 “을”이 위탁한 채굴 클라우드 서버의 소유권은 “갑”에게 있다.
`,
          `
제4조 관리보고
1)”갑”은 채굴된 도지코인을 “을”의 전자지갑에 입금하여야 하고 전자지갑에 입금된 코인 가격의 변동은 “갑”에게 일체의 책임이 없다.
2)”을”은 “갑”이 위탁관리 하여 채굴된 코인의 양은 변동성이 있으며 전자지갑에 코인을 입금한 날로부터 코인의 입금 수량 등 일체에 관하여 “갑”에게 어떠한 이의를 제기할 수 없다. 이는 코인이 정상적으로 전달되었더라도 “을”의 개인지갑 관리 과정에서 발생된 책임이 “갑”에게 전가 시키지 못하게 하고자 함이다.
3)코인 채굴량은 도지코인 채굴 환경에 따라 달라질 수 있다.
`,
          `
제5조 양도금지
“갑”과 “을”은 이 계약에 따른 권리를 제3자에게 양도하거나 담보를 제공할 수 없으며, 이를 위반하여 양도하거나 담보를 제공하더라도 서로에게 그 권리를 주장할 수 없다.
`,
          `
제6조 계약의 해지
1)“을의 단순 변심으로 인한 계약해지는 할 수 없다.
2)”갑” 또는 “을”은 당사자 일방의 귀책사유로 더 이상 계약의 목적을 달성할 수 없는 경우에는 문서로 계약을 해지할 수 있다. 이 경우 이미 행한 위탁관리의 법률관계에는 어떠한 영향도 미치지 아니하고, 장래에 향하여 계약관계를 소멸시킨다.
`,
          `
제 7조 천재 지변(불가항력)
본 계약은 천재지변(불가항력)으로 인해 계약의 이행이 불가능하거나, 계약 목적이 달성될 수 없다고 인정되는 경우 어느 한쪽 당사자는 상대방에게 서면으로 통지하고 계약을 해지할 수 있음. 이 경우, 당사자들은 상호 간 손해배상 책임을 면제하며, 이행 불가능 이전에 발생한 의무는 계속 유효 하다.
`,
          `
제8조 관할법원
본 계약과 관련하여 분쟁이 발생하는 경우 “갑”의 주소지의 관할법원에서 해결하기로 한다.
`,
        ],
        companyName: 'BoostX Inc.',
        companyAddress: '서울 강남구 신사동 525-14',
        businessNumber: '02-512-4440',
        representative: 'Jang Juntae',
      });
      return defaultContract.save();
    }
    return exists;
  }

  async saveContractAsPdf(contractId: string): Promise<string> {
    const contract = await this.contractModel.findById(contractId).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const pdfDir = path.join(__dirname, '../../../pdf');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }

    const pdfPath = path.join(pdfDir, `${contractId}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));

    // 한글 폰트 설정
    const fontPath = path.join(__dirname, '../../../fonts/AritaBuriB.ttf');
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      console.warn('Font file not found, using default font.');
      doc.font('Helvetica'); // 기본 폰트로 설정
    }

    // 제목 설정
    doc.fontSize(20).text(contract.content[0], { align: 'center' });
    doc.moveDown();

    // 계약 내용 설정
    for (let i = 1; i < contract.content.length; i++) {
      doc.fontSize(12).text(contract.content[i]);
      doc.moveDown();
    }

    // 날짜 설정
    const currentDate = new Date().toISOString().split('T')[0];
    doc.fontSize(12).text(currentDate, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Package Name: ${contract.packageName}`);
    doc.text(`Quantity: ${contract.quantity}`);
    doc.text(`Total Price: ${contract.totalPrice}`);
    doc.moveDown();
    doc.moveDown();
    doc.text(`Customer Name: ${contract.customerName}`);
    doc.text(`Customer Phone: ${contract.customerPhone}`);
    doc.text(`Customer Address: ${contract.customerAddress}`);
    doc.moveDown();
    doc.moveDown();
    doc.text(`Company Name: ${contract.companyName}`);
    doc.text(`Company Address: ${contract.companyAddress}`);
    doc.text(`Business Number: ${contract.businessNumber}`);
    doc.text(`Representative: ${contract.representative}`);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('finish', () => resolve(pdfPath));
      doc.on('error', reject);
    });
  }

  async sendContractByEmail(contractId: string, email: string): Promise<void> {
    const pdfPath = await this.saveContractAsPdf(contractId);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Your Contract',
      text: 'Please find attached your contract.',
      attachments: [
        {
          filename: `${contractId}.pdf`,
          path: pdfPath,
        },
      ],
    });

    // Delete the PDF file after sending the email
    fs.unlinkSync(pdfPath);
  }

  async saveContractToFile(contractId: string): Promise<string> {
    const contract = await this.contractModel.findById(contractId).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const fileDir = path.join(__dirname, '../../../../pdfs');
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir);
    }

    const filePath = path.join(fileDir, `${contractId}.txt`);
    const content = `
      Contract
      Customer Name: ${contract.customerName}
      Customer Phone: ${contract.customerPhone}
      Customer Address: ${contract.customerAddress}
      Package Name: ${contract.packageName}
      Quantity: ${contract.quantity}
      Total Price: ${contract.totalPrice}
      
      Company Name: ${contract.companyName}
      Company Address: ${contract.companyAddress}
      Business Number: ${contract.businessNumber}
      Representative: ${contract.representative}
    `;

    fs.writeFileSync(filePath, content.trim());

    return filePath;
  }
}
