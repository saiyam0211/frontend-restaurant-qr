import React from "react";
import { cn } from "../../lib/utils";

export function Select({ children, onValueChange, value, ...props }) {
  const [currentValue, setCurrentValue] = React.useState(value);

  const handleChange = (newValue) => {
    setCurrentValue(newValue);
    onValueChange && onValueChange(newValue);
  };

  return (
    <div {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          currentValue,
          onChange: handleChange,
        })
      )}
    </div>
  );
}

export function SelectTrigger({ children, currentValue, ...props }) {
  return (
    <div className="border rounded px-3 py-2 cursor-pointer" {...props}>
      {currentValue || children}
    </div>
  );
}

export function SelectValue(props) {
  return <div {...props} />;
}

export function SelectContent({ children, currentValue, onChange, ...props }) {
  return (
    <div className="absolute z-10 bg-white border rounded shadow-lg" {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          currentValue,
          onChange,
        })
      )}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  currentValue,
  onChange,
  ...props
}) {
  const handleClick = () => {
    onChange(value);
  };

  return (
    <div
      className={cn(
        "px-3 py-2 cursor-pointer hover:bg-gray-100",
        currentValue === value ? "bg-gray-200" : ""
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}
