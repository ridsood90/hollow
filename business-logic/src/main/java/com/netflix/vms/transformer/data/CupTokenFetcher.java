package com.netflix.vms.transformer.data;

import com.netflix.hollow.core.index.HollowPrimaryKeyIndex;
import com.netflix.vms.transformer.common.config.TransformerConfig;
import com.netflix.vms.transformer.hollowinput.ContractHollow;
import com.netflix.vms.transformer.hollowinput.VMSHollowInputAPI;
import com.netflix.vms.transformer.hollowoutput.CupKey;
import com.netflix.vms.transformer.hollowoutput.Strings;
import com.netflix.vms.transformer.index.IndexSpec;
import com.netflix.vms.transformer.index.VMSTransformerIndexer;

/**
 * A helper class to encapsulate extracting Cup tokens from the HollowInputAPI. Once we finish the migration from
 * Beehive cup tokens to Cinder cup tokens, this class can be removed and its functionality inlined.
 */
public class CupTokenFetcher {
    private final HollowPrimaryKeyIndex cupTokenCinderIndex;
    private final TransformerConfig config;
    private final VMSHollowInputAPI api;

    public CupTokenFetcher(TransformerConfig config, VMSTransformerIndexer indexer,
            VMSHollowInputAPI api) {
        this.config = config;
        this.cupTokenCinderIndex = indexer.getPrimaryKeyIndex(IndexSpec.CUP_TOKEN);
        this.api = api;
    }

    public Strings getCupToken(long videoId, ContractHollow contract) {
        return new Strings(getCupTokenString(videoId, contract));
    }

    public String getCupTokenString(long videoId, ContractHollow contract) {
        if (contract == null) {
            return CupKey.DEFAULT;
        }
        return config.isReadCupTokensFromCinderFeed() ? getCupTokenStringCinder(videoId, contract._getContractId()) :
                getCupTokenStringBeehive(contract);
    }

    private String getCupTokenStringCinder(long videoId, long contractId) {
        int ordinal = cupTokenCinderIndex.getMatchingOrdinal(videoId, contractId);
        return ordinal == -1 ? CupKey.DEFAULT : api.getCinderCupTokenRecordHollow(ordinal)._getCupTokenId()._getValue();
    }

    private String getCupTokenStringBeehive(ContractHollow contract) {
        return contract._getCupToken() == null ? CupKey.DEFAULT : contract._getCupToken()._getValue();
    }
}