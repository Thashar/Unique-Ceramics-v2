const LETTERS_PL = "a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ";

export const ADDRESS_PATTERNS = {
  // Imię / Nazwisko: same litery (polskie), spacja, łącznik, apostrof — min 2 znaki
  name:     new RegExp(`^[${LETTERS_PL}][${LETTERS_PL}\\s\\-']{1,49}$`),
  // Telefon: 9 cyfr, opcjonalnie poprzedzone +48 (spacje i łączniki ignorowane przy sprawdzaniu)
  phone:    /^(\+48)?[0-9]{9}$/,
  // Ulica i numer: musi zawierać nazwę (litery) i numer budynku (cyfry), np. "Różana 1", "Kwiatowa 2/3"
  street:   new RegExp(`^[${LETTERS_PL}0-9][${LETTERS_PL}0-9\\s\\.\\-\\/,]{2,99}$`),
  // Kod pocztowy: format XX-XXX
  postcode: /^\d{2}-\d{3}$/,
  // Miasto: litery, spacja, łącznik (np. "Nowy Sącz", "Bielsko-Biała")
  city:     new RegExp(`^[${LETTERS_PL}][${LETTERS_PL}\\s\\-]{1,59}$`),
};

export const ADDRESS_ERRORS = {
  name:     "Tylko litery (imię/nazwisko może zawierać łącznik lub apostrof)",
  phone:    "Telefon: 9 cyfr, opcjonalnie poprzedzone +48",
  street:   "Podaj ulicę i numer budynku, np. Różana 1 lub Kwiatowa 2/3",
  postcode: "Kod pocztowy w formacie XX-XXX, np. 44-111",
  city:     "Miasto: same litery (można używać spacji i łącznika)",
};

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-]/g, "");
}

export interface AddressFields {
  firstName: string;
  lastName:  string;
  phone?:    string;
  street:    string;
  postcode:  string;
  city:      string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof AddressFields, string>>;
}

export function validateAddress(data: AddressFields): ValidationResult {
  const errors: Partial<Record<keyof AddressFields, string>> = {};

  if (!ADDRESS_PATTERNS.name.test(data.firstName.trim())) {
    errors.firstName = ADDRESS_ERRORS.name;
  }
  if (!ADDRESS_PATTERNS.name.test(data.lastName.trim())) {
    errors.lastName = ADDRESS_ERRORS.name;
  }
  if (data.phone && data.phone.trim()) {
    const normalized = normalizePhone(data.phone.trim());
    if (!ADDRESS_PATTERNS.phone.test(normalized)) {
      errors.phone = ADDRESS_ERRORS.phone;
    }
  }
  if (!ADDRESS_PATTERNS.street.test(data.street.trim())) {
    errors.street = ADDRESS_ERRORS.street;
  }
  if (!ADDRESS_PATTERNS.postcode.test(data.postcode.trim())) {
    errors.postcode = ADDRESS_ERRORS.postcode;
  }
  if (!ADDRESS_PATTERNS.city.test(data.city.trim())) {
    errors.city = ADDRESS_ERRORS.city;
  }

  // Ulica musi zawierać co najmniej jedną cyfrę (numer budynku)
  if (!errors.street && !/\d/.test(data.street)) {
    errors.street = ADDRESS_ERRORS.street;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
