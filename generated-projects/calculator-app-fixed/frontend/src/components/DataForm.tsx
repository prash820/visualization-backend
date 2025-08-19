// DataForm.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Button from './Button';
import Input from './Input';
import { useApi } from './useApi';
import { ArithmeticOperation, OperationResult } from './types';
import { validateArithmeticOperation } from './utils';

interface DataFormProps {
  onSubmit: (result: OperationResult) => void;
}

const DataForm: React.FC<DataFormProps> = ({ onSubmit }) => {
  const { calculate } = useApi();
  const [operand1, setOperand1] = useState('');
  const [operand2, setOperand2] = useState('');
  const [operator, setOperator] = useState<'+' | '-' | '*' | '/' | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCalculation = async () => {
    const operation: ArithmeticOperation = {
      operand1: parseFloat(operand1),
      operand2: parseFloat(operand2),
      operator: operator as '+' | '-' | '*' | '/'
    };

    if (!validateArithmeticOperation(operation)) {
      setFormError('Invalid input. Please ensure all fields are correctly filled.');
      return;
    }

    try {
      const result = await calculate(operation);
      onSubmit(result);
      Alert.alert('Success', `Result: ${result}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to perform calculation.');
    }
  };

  return (
    <View style={styles.container}>
      <Input
        label="Operand 1"
        placeholder="Enter first number"
        value={operand1}
        onChangeText={setOperand1}
        error={formError}
      />
      <Input
        label="Operator"
        placeholder="Enter operator (+, -, *, /)"
        value={operator}
        onChangeText={setOperator}
        error={formError}
      />
      <Input
        label="Operand 2"
        placeholder="Enter second number"
        value={operand2}
        onChangeText={setOperand2}
        error={formError}
      />
      <Button
        title="Calculate"
        onPress={handleCalculation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
});

export default DataForm;
