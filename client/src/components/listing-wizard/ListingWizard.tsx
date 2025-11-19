      // Prepare listing data
      const listingData = {
        action: store.action!,
        propertyType: store.propertyType!,
        title: store.title,
        description: store.description,
        pricing: {
          ...store.pricing!,
          // Ensure transferCostEstimate is either a number or undefined (not null)
          ...(store.pricing!.transferCostEstimate !== null && store.pricing!.transferCostEstimate !== undefined
            ? { transferCostEstimate: store.pricing!.transferCostEstimate }
            : {}),
        },
        propertyDetails: store.propertyDetails || {},
        location: store.location!,
        mediaIds: store.media.map((m: any) => m.id),
        mainMediaId: store.mainMediaId,
        status: 'pending_review' as const,
      };