import { useState } from 'react';

export const useAppModals = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [distributionModalVisible, setDistributionModalVisible] = useState(false);
  const [profitModalVisible, setProfitModalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listOptionsVisible, setListOptionsVisible] = useState(false);

  const [selectedAssetInfo, setSelectedAssetInfo] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedPieSlice, setSelectedPieSlice] = useState(null);
  const [selectedOptionList, setSelectedOptionList] = useState(null);

  return {
    modalVisible, setModalVisible,
    sellModalVisible, setSellModalVisible,
    settingsVisible, setSettingsVisible,
    detailModalVisible, setDetailModalVisible,
    distributionModalVisible, setDistributionModalVisible,
    profitModalVisible, setProfitModalVisible,
    cashModalVisible, setCashModalVisible,
    listModalVisible, setListModalVisible,
    listOptionsVisible, setListOptionsVisible,
    selectedAssetInfo, setSelectedAssetInfo,
    selectedAssetId, setSelectedAssetId,
    selectedPieSlice, setSelectedPieSlice,
    selectedOptionList, setSelectedOptionList
  };
};
