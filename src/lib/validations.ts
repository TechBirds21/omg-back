// @ts-nocheck
// Email validation utility
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  // Check for common typos in domain
  const domain = email.split('@')[1]?.toLowerCase();
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];
  const commonTypos: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com'
  };

  if (domain && commonTypos[domain]) {
    return { 
      isValid: false, 
      message: `Did you mean ${email.split('@')[0]}@${commonTypos[domain]}?` 
    };
  }

  return { isValid: true };
};

// Mobile number validation utility
export const validateMobileNumber = (mobile: string): { isValid: boolean; message?: string } => {
  if (!mobile || mobile.trim() === '') {
    return { isValid: false, message: 'Mobile number is required' };
  }

  // Remove all non-digit characters
  const cleanMobile = mobile.replace(/\D/g, '');
  
  // Check if it's empty after cleaning
  if (cleanMobile === '') {
    return { isValid: false, message: 'Please enter a valid mobile number' };
  }

  let finalDigits = cleanMobile;

  // Handle different input formats
  if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    // +91 format: take last 10 digits
    finalDigits = cleanMobile.slice(2);
  } else if (cleanMobile.length === 11 && cleanMobile.startsWith('0')) {
    // 0 prefix format: take last 10 digits
    finalDigits = cleanMobile.slice(1);
  } else if (cleanMobile.length === 10) {
    // Already 10 digits
    finalDigits = cleanMobile;
  } else {
    // Invalid length
    return { isValid: false, message: 'Please enter a valid 10-digit mobile number' };
  }

  // Validate the final 10 digits
  if (finalDigits.length === 10) {
    const firstDigit = finalDigits[0];
    if (!firstDigit || !['6', '7', '8', '9'].includes(firstDigit)) {
      return { 
        isValid: false, 
        message: 'Please enter a valid Indian mobile number (should start with 6, 7, 8, or 9)' 
      };
    }

    // Check for obviously invalid numbers (all same digits, sequential, etc.)
    if (finalDigits === firstDigit.repeat(10)) {
      return { isValid: false, message: 'Please enter a valid mobile number' };
    }

    // Check for sequential numbers
    const isSequential = finalDigits.split('').every((digit, index) => {
      if (index === 0) return true;
      const prevDigit = finalDigits[index - 1];
      if (!prevDigit) return false;
      const prev = parseInt(prevDigit);
      const current = parseInt(digit);
      return Math.abs(current - prev) === 1;
    });

    if (isSequential) {
      return { isValid: false, message: 'Please enter a valid mobile number' };
    }

    return { isValid: true };
  }

  return { isValid: false, message: 'Please enter a valid 10-digit mobile number' };
};

// Format mobile number for display
export const formatMobileNumber = (mobile: string): string => {
  const cleanMobile = mobile.replace(/\D/g, '');
  
  let finalDigits = cleanMobile;
  
  // Handle different input formats
  if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    finalDigits = cleanMobile.slice(2);
  } else if (cleanMobile.length === 11 && cleanMobile.startsWith('0')) {
    finalDigits = cleanMobile.slice(1);
  }
  
  if (finalDigits.length === 10) {
    return finalDigits.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  
  return mobile; // Return original if can't format
};

// Real-time validation helper
export const getValidationClass = (isValid: boolean, hasBeenTouched: boolean): string => {
  if (!hasBeenTouched) return '';
  return isValid ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500';
};

// Phone input handler
export const handlePhoneInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Handle different input formats and normalize to 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    // +91 format: return last 10 digits
    return digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 0 prefix format: return last 10 digits
    return digits.slice(1);
  } else {
    // For other cases, limit to 10 digits
    return digits.slice(0, 10);
  }
};

// Extract clean phone number (digits only) for storage
export const extractPhoneDigits = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats and normalize to 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  } else {
    return digits.slice(0, 10);
  }
};

// Normalize phone number for searching (more flexible than validation)
export const normalizePhoneForSearch = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats and normalize to 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    // +91 format: return last 10 digits
    return digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 0 prefix format: return last 10 digits
    return digits.slice(1);
  } else if (digits.length === 10) {
    // Already 10 digits
    return digits;
  } else if (digits.length > 10) {
    // If more than 10 digits, take last 10
    return digits.slice(-10);
  } else {
    // If less than 10 digits, pad with leading zeros or return as is
    return digits.padStart(10, '0');
  }
};

// Sanitize text input (remove HTML tags and limit length)
export const sanitizeText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, maxLength);
};

// Validate customer name
export const validateName = (name: string): { isValid: boolean; message?: string } => {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Name is required' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters' };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, message: 'Name must be less than 100 characters' };
  }
  
  // Check for suspicious patterns (HTML tags, scripts)
  if (/<[^>]*>|<script|javascript:|onerror=/i.test(trimmedName)) {
    return { isValid: false, message: 'Name contains invalid characters' };
  }
  
  return { isValid: true };
};

// Validate address
export const validateAddress = (address: string): { isValid: boolean; message?: string } => {
  if (!address || !address.trim()) {
    return { isValid: false, message: 'Address is required' };
  }
  
  const trimmedAddress = address.trim();
  
  if (trimmedAddress.length < 10) {
    return { isValid: false, message: 'Address must be at least 10 characters' };
  }
  
  if (trimmedAddress.length > 500) {
    return { isValid: false, message: 'Address must be less than 500 characters' };
  }
  
  // Check for suspicious patterns
  if (/<[^>]*>|<script|javascript:|onerror=/i.test(trimmedAddress)) {
    return { isValid: false, message: 'Address contains invalid characters' };
  }
  
  return { isValid: true };
};

// Validate pincode (Indian format)
export const validatePincode = (pincode: string): { isValid: boolean; message?: string } => {
  if (!pincode || !pincode.trim()) {
    return { isValid: false, message: 'Pincode is required' };
  }
  
  const trimmedPincode = pincode.trim();
  
  // Indian pincode format: 6 digits
  if (!/^[0-9]{6}$/.test(trimmedPincode)) {
    return { isValid: false, message: 'Pincode must be 6 digits' };
  }
  
  return { isValid: true };
};

// Validate city/state (alphabetic with spaces)
export const validateCityState = (value: string, fieldName: string = 'City'): { isValid: boolean; message?: string } => {
  if (!value || !value.trim()) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const trimmedValue = value.trim();
  
  if (trimmedValue.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters` };
  }
  
  if (trimmedValue.length > 100) {
    return { isValid: false, message: `${fieldName} must be less than 100 characters` };
  }
  
  // Allow letters, spaces, and common punctuation
  if (!/^[a-zA-Z\s\-\.]+$/.test(trimmedValue)) {
    return { isValid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and periods` };
  }
  
  return { isValid: true };
};

// Validate order notes / comments
export const validateNotes = (notes: string, maxLength: number = 1000): { isValid: boolean; message?: string } => {
  if (!notes) {
    return { isValid: true }; // Notes are optional
  }
  
  if (notes.length > maxLength) {
    return { isValid: false, message: `Notes must be less than ${maxLength} characters` };
  }
  
  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(notes)) {
    return { isValid: false, message: 'Notes contain invalid content' };
  }
  
  return { isValid: true };
};

// Form validation helper with enhanced type checking
export const validateForm = (fields: Record<string, { 
  value: string; 
  required?: boolean; 
  type?: 'email' | 'mobile' | 'name' | 'address' | 'pincode' | 'city' | 'state' | 'notes' 
}>) => {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [fieldName, field] of Object.entries(fields)) {
    const { value, required = false, type } = field;

    // Check required fields
    if (required && (!value || value.trim() === '')) {
      errors[fieldName] = 'This field is required';
      isValid = false;
      continue;
    }

    // Skip validation for empty optional fields
    if (!value || value.trim() === '') continue;

    // Type-specific validation
    if (type === 'email') {
      const emailValidation = validateEmail(value);
      if (!emailValidation.isValid) {
        errors[fieldName] = emailValidation.message || 'Invalid email';
        isValid = false;
      }
    } else if (type === 'mobile') {
      const mobileValidation = validateMobileNumber(value);
      if (!mobileValidation.isValid) {
        errors[fieldName] = mobileValidation.message || 'Invalid mobile number';
        isValid = false;
      }
    } else if (type === 'name') {
      const nameValidation = validateName(value);
      if (!nameValidation.isValid) {
        errors[fieldName] = nameValidation.message || 'Invalid name';
        isValid = false;
      }
    } else if (type === 'address') {
      const addressValidation = validateAddress(value);
      if (!addressValidation.isValid) {
        errors[fieldName] = addressValidation.message || 'Invalid address';
        isValid = false;
      }
    } else if (type === 'pincode') {
      const pincodeValidation = validatePincode(value);
      if (!pincodeValidation.isValid) {
        errors[fieldName] = pincodeValidation.message || 'Invalid pincode';
        isValid = false;
      }
    } else if (type === 'city' || type === 'state') {
      const cityStateValidation = validateCityState(value, type);
      if (!cityStateValidation.isValid) {
        errors[fieldName] = cityStateValidation.message || `Invalid ${type}`;
        isValid = false;
      }
    } else if (type === 'notes') {
      const notesValidation = validateNotes(value);
      if (!notesValidation.isValid) {
        errors[fieldName] = notesValidation.message || 'Invalid notes';
        isValid = false;
      }
    }
  }

  return { isValid, errors };
};
