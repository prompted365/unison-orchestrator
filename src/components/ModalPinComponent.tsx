import { ModalPin } from "../types";

interface ModalPinComponentProps {
  pin: ModalPin;
}

export const ModalPinComponent = ({ pin }: ModalPinComponentProps) => {
  const getPinClass = () => {
    return `modal-pin ${pin.mode}`;
  };

  return (
    <div
      className={getPinClass()}
      style={{
        left: `${pin.x}px`,
        top: `${pin.y}px`
      }}
    >
      <div className="font-bold text-xs mb-1">
        {pin.title}
      </div>
      <div className="text-xs mb-2 whitespace-pre-wrap">
        {pin.body}
      </div>
      <div className="text-xs opacity-90">
        {pin.tags}
      </div>
    </div>
  );
};