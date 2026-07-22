import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;
const MIN_INPUT_LENGTH = 2;

// City/region autocomplete for the location/hometown fields - debounced fetch to GET /api/places/autocomplete, a dropdown of suggestions, click-outside-to-close. Free text stays allowed: selecting a suggestion fills the field (via the same event shape a plain <input>'s onChange would emit, so this is a drop-in replacement everywhere it's used) and fires onCommit with the selected description; not selecting one doesn't block saving whatever was typed.
export default function CityAutocompleteInput({
  id,
  name,
  value,
  onChange,
  onCommit,
  onBlur,
  onKeyDown,
  placeholder,
  autoFocus,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Closes the dropdown on a click anywhere outside the component.
  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Clears a pending debounce on unmount so a stale fetch can't update state after the component is gone.
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Passes the native event straight through to onChange first (matches this app's existing <input onChange={onChange}> convention), then separately debounces the suggestion fetch.
  function handleInputChange(event) {
    onChange(event);

    clearTimeout(debounceRef.current);
    const trimmed = event.target.value.trim();
    if (trimmed.length < MIN_INPUT_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((results) => {
          setSuggestions(results);
          setOpen(results.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, DEBOUNCE_MS);
  }

  // Fills the field with the selected suggestion and passes it to onCommit directly, since onChange's state update isn't synchronous and a caller can't rely on it having landed yet by the time onCommit runs.
  function selectSuggestion(description) {
    onChange({ target: { name, value: description } });
    setSuggestions([]);
    setOpen(false);
    onCommit?.(description);
  }

  // Closes the dropdown on Escape, then still forwards to whatever onKeyDown the caller passed in (e.g. Profile.jsx's Enter-to-commit).
  function handleKeyDown(event) {
    if (event.key === "Escape") setOpen(false);
    onKeyDown?.(event);
  }

  return (
    <div className="city-autocomplete" ref={containerRef}>
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul className="city-autocomplete-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId} role="option">
              {/* preventDefault on mousedown keeps focus on the input until after the click handler runs - without it, the button click would blur the input first, firing onBlur with the stale pre-selection text. */}
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion.description)}
              >
                {suggestion.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
