import { CreateElectionTables20261022120000 } from "./20261022120000-CreateElectionTables";
import { AddCandidateFullNameAndPhoto20261022150000 } from "./20261022150000-AddCandidateFullNameAndPhoto";
import { AddBlankAndNullBallotOptions20261022180000 } from "./20261022180000-AddBlankAndNullBallotOptions";
import { AddGoogleVoters20261023090000 } from "./20261023090000-AddGoogleVoters";

// Explicit list (instead of a glob) so the serverless bundle includes every
// migration. Append new migrations here in chronological order.
export const MIGRATIONS = [
  CreateElectionTables20261022120000,
  AddCandidateFullNameAndPhoto20261022150000,
  AddBlankAndNullBallotOptions20261022180000,
  AddGoogleVoters20261023090000,
];
