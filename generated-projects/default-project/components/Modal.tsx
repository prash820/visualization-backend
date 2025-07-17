import React, { useState, useEffect } from 'react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
  const [visible, setVisible] = useState<boolean>(isOpen);

  useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setVisible(false);
    onClose();
  };

  return (
    <div
      className={`modal ${visible ? 'modal-open' : 'modal-closed'}`}
      role="dialog"
      aria-labelledby="modal-title"
      aria-hidden={!visible}
    >
      <div className="modal-content">
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;