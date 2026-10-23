import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Registry of who already voted. Stores only an HMAC of the Google account
 * id — never the e-mail or name — and has no relation to VoteEntity: the
 * ballot stays secret even to whoever can read the database.
 */
@Entity("tb_voters")
export class VoterEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_voters" })
  idVoters!: string;

  // Legacy: voters from the first release, which identified by CPF. No
  // longer written; kept so those votes stay counted.
  @Column({
    name: "cpf_hash",
    type: "char",
    length: 64,
    unique: true,
    nullable: true,
  })
  cpfHash!: string | null;

  @Column({
    name: "google_hash",
    type: "char",
    length: 64,
    unique: true,
    nullable: true,
  })
  googleHash!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
