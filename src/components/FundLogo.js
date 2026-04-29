/* src/components/FundLogo.js 
Davranış:
Eğer fund.type === "TEFAS": local assets/logos/tefas_index.js haritasından logo alır (varsa).
Aksi takdirde: fund.logoUrl varsa remote uri kullanır.
Varsayılan: assets/logos/tefas_index.js içindeki default kullanılır. */ 

import React, { useState } from "react"; 
import { Image } from "react-native"; 
import TefasLogos from "../../assets/logos/tefas_index";

export default function FundLogo({ fund, style, imageProps }) { 
  const [failed, setFailed] = useState(false);

  if (fund?.type === 'TEFAS') { 
    const slug = (fund?.symbol || fund?.code || '').toString().trim().toLowerCase(); 
    const source = (slug && TefasLogos[slug]) ? TefasLogos[slug] : TefasLogos.default; 
    return <Image source={source} style={style} {...imageProps} />; 
  }

  // Non-TEFAS: önce remote varsa onu dene, başarısızsa default görsel 
  if (fund?.logoUrl && !failed) { 
    return ( 
      <Image 
        source={{ uri: fund.logoUrl }} 
        style={style} 
        onError={() => setFailed(true)} 
        {...imageProps} 
      /> 
    ); 
  }

  // Fallback: yerel default (tefas_index içindeki default) 
  return <Image source={TefasLogos.default} style={style} {...imageProps} />; 
}
