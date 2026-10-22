import { isValidCpf, normalizeCpf } from "../utils/cpf.util";
import { ageOn, parseBirthDate, sameBirthDate } from "../utils/birth-date.util";

describe("cpf.util", () => {
  it("normalizes formatted CPFs", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });

  it.each(["52998224725", "529.982.247-25", "11144477735"])(
    "accepts valid CPF %s",
    (cpf) => expect(isValidCpf(cpf)).toBe(true),
  );

  it.each([
    "52998224724", // wrong last digit
    "52998224715", // wrong first digit
    "11111111111", // repeated digits pass the math but are invalid
    "00000000000",
    "1234567890", // too short
    "",
  ])("rejects invalid CPF %s", (cpf) => expect(isValidCpf(cpf)).toBe(false));
});

describe("birth-date.util", () => {
  it("parses real dates only", () => {
    expect(parseBirthDate("1990-06-15")).toEqual({
      year: 1990,
      month: 6,
      day: 15,
    });
    expect(parseBirthDate("1990-02-30")).toBeNull();
    expect(parseBirthDate("15/06/1990")).toBeNull();
    expect(parseBirthDate("1850-01-01")).toBeNull();
  });

  it("computes age around the birthday", () => {
    const birth = { year: 2010, month: 10, day: 22 };
    expect(ageOn(birth, new Date(Date.UTC(2026, 9, 21)))).toBe(15);
    expect(ageOn(birth, new Date(Date.UTC(2026, 9, 22)))).toBe(16);
  });

  it("compares birth dates", () => {
    const a = { year: 1990, month: 6, day: 15 };
    expect(sameBirthDate(a, { ...a })).toBe(true);
    expect(sameBirthDate(a, { ...a, day: 16 })).toBe(false);
  });
});
