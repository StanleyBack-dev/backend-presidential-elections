import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Registry of who already voted. Stores only an HMAC of the CPF, and has no
 * relation to VoteEntity — the ballot stays secret even to whoever can read
 * the database.
 */
@Entity("tb_voters")
export class VoterEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_voters" })
  idVoters!: string;

  @Column({ name: "cpf_hash", type: "char", length: 64, unique: true })
  cpfHash!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
