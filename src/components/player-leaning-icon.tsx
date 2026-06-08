type Props = {
  leaning: string;
  size?: number;
  className?: string;
};

function OffenseGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#DC2626"
        d="M332.16,104.596c-34.594-27.688-48.125-58.25-53.328-79.969c-4.172-17.453-1.953-19.328-1.953-19.328c-0.219-2.078-1.5-3.875-3.406-4.75c-1.875-0.875-4.094-0.703-5.797,0.484c0,0-6.703,1.453-17.641,12.063c-24.875,24.156-53.031,64.469-34.469,119.578c19.891,59.125,9.375,71.5-1.047,70.688c-13.516-1.031-15.609-9.359-13.438-35.266c2.516-30.281-24.953-56.141-24.953-56.141s-42.672,67.844-75.953,116.375c-19.672,28.688-29.109,65.141-29.109,98.406H70.41c0,102.313,82.938,185.266,185.25,185.266s185.25-82.953,185.25-185.266C447.941,237.893,399.691,158.611,332.16,104.596z M255.988,459.83c-56.422,0-102.188-45.75-102.188-102.188c0-19.219,5.328-37.188,14.547-52.547c7.938,29.563,34.906,51.328,66.969,51.328c38.281,0,69.344-31.047,69.344-69.344c0-7.297-1.156-14.359-3.25-20.969c33.656,16.719,56.766,51.422,56.766,91.531C358.175,414.08,312.425,459.83,255.988,459.83z"
      />
    </svg>
  );
}

function DefenseGlyph({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#1D4ED8"
        d="M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z"
      />
    </svg>
  );
}

export function LeaningIcon({ leaning, size = 14, className = "" }: Props) {
  const sharedClass = `inline-block shrink-0 align-middle ${className}`;
  const offensive = leaning === "offensive";

  return offensive ? (
    <OffenseGlyph size={size} className={sharedClass} />
  ) : (
    <DefenseGlyph size={size} className={sharedClass} />
  );
}
