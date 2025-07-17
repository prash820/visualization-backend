import React from 'react';

interface FormValidatorProps {
  email: string;
  password: string;
  onValidation: (isValid: boolean, errors: string[]) => void;
}

const FormValidator: React.FC<FormValidatorProps> = ({ email, password, onValidation }) => {
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  React.useEffect(() => {
    const errors: string[] = [];
    if (!validateEmail(email)) {
      errors.push('Invalid email format.');
    }
    if (!validatePassword(password)) {
      errors.push('Password must be at least 8 characters long.');
    }
    onValidation(errors.length === 0, errors);
  }, [email, password, onValidation]);

  return null;
};

export default FormValidator;