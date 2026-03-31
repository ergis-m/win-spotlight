import { forwardRef, useEffect, useRef, type ChangeEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange }, ref) => {
    const timerRef = useRef<number | null>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => onChange(val), 50);
      // Update input immediately via parent
      onChange(val);
    };

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <div className="search-bar">
        <span className="search-icon">&#128269;</span>
        <input
          ref={ref}
          type="text"
          className="search-input"
          placeholder="Search apps, commands..."
          autoFocus
          value={value}
          onChange={handleChange}
        />
      </div>
    );
  }
);
