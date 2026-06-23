import React from 'react';

export const LogoTextComponent = () => {
  return (
    <div className="flex items-baseline gap-[1px] select-none">
      <span className="text-[22px] font-[600] tracking-tight text-textColor leading-none">
        Promura Agency
      </span>
      <span
        className="text-[22px] font-[600] leading-none"
        style={{ color: '#ff3daa' }}
      >
        :
      </span>
    </div>
  );
};
