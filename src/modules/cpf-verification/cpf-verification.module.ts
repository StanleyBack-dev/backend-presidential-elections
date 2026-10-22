import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isDeployedEnv } from "../../config/environment.util";
import {
  CPF_VERIFICATION_PROVIDER,
  CpfVerificationProvider,
} from "./providers/cpf-verification.provider";
import { CpfHubCpfVerificationProvider } from "./providers/cpfhub-cpf-verification.provider";
import { LocalCpfVerificationProvider } from "./providers/local-cpf-verification.provider";

@Module({
  providers: [
    {
      provide: CPF_VERIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CpfVerificationProvider => {
        const provider = config.get<string>("CPF_VERIFICATION_PROVIDER");

        if (provider === "cpfhub") {
          return new CpfHubCpfVerificationProvider(
            config.get<string>("CPFHUB_BASE_URL")!,
            config.get<string>("CPFHUB_API_KEY")!,
            config.get<number>("CPF_VERIFICATION_TIMEOUT_MS")!,
          );
        }

        if (isDeployedEnv()) {
          new Logger("CpfVerificationModule").warn(
            "CPF_VERIFICATION_PROVIDER=local in a deployed environment: only check digits are validated.",
          );
        }

        return new LocalCpfVerificationProvider();
      },
    },
  ],
  exports: [CPF_VERIFICATION_PROVIDER],
})
export class CpfVerificationModule {}
