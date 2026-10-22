import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BallotOptionKind } from "../enums/ballot-option-kind.enum";

@Entity("tb_candidates")
export class CandidateEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_candidates" })
  idCandidates!: string;

  @Column({ name: "slug", type: "varchar", length: 40, unique: true })
  slug!: string;

  /** Name as shown on the ballot ("nome de urna"). */
  @Column({ name: "name", type: "varchar", length: 120 })
  name!: string;

  /** Full legal name as registered with the TSE. */
  @Column({ name: "full_name", type: "varchar", length: 160 })
  fullName!: string;

  /** Official candidacy photo (TSE), relative to the frontend origin. */
  @Column({ name: "photo_url", type: "varchar", length: 255, nullable: true })
  photoUrl!: string | null;

  /** Null for blank/null ballot options. */
  @Column({ name: "party", type: "varchar", length: 20, nullable: true })
  party!: string | null;

  /** Null for blank/null ballot options. */
  @Column({
    name: "ballot_number",
    type: "smallint",
    unique: true,
    nullable: true,
  })
  ballotNumber!: number | null;

  @Column({
    name: "kind",
    type: "varchar",
    length: 12,
    default: BallotOptionKind.CANDIDATE,
  })
  kind!: BallotOptionKind;

  @Column({ name: "color", type: "varchar", length: 7 })
  color!: string;

  @Column({ name: "display_order", type: "smallint", default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
