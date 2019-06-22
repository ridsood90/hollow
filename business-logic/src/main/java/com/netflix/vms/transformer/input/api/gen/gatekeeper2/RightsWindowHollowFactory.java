package com.netflix.vms.transformer.input.api.gen.gatekeeper2;

import com.netflix.hollow.api.custom.HollowTypeAPI;
import com.netflix.hollow.api.objects.provider.HollowFactory;
import com.netflix.hollow.core.read.dataaccess.HollowTypeDataAccess;

@SuppressWarnings("all")
public class RightsWindowHollowFactory<T extends RightsWindow> extends HollowFactory<T> {

    @Override
    public T newHollowObject(HollowTypeDataAccess dataAccess, HollowTypeAPI typeAPI, int ordinal) {
        return (T)new RightsWindow(((RightsWindowTypeAPI)typeAPI).getDelegateLookupImpl(), ordinal);
    }

    @Override
    public T newCachedHollowObject(HollowTypeDataAccess dataAccess, HollowTypeAPI typeAPI, int ordinal) {
        return (T)new RightsWindow(new RightsWindowDelegateCachedImpl((RightsWindowTypeAPI)typeAPI, ordinal), ordinal);
    }

}