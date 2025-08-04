//
//  WellAuraWatch.swift
//  WellAuraWatch
//
//  Created by Leigha Day-Clark on 03/06/2025.
//

import AppIntents

struct WellAuraWatch: AppIntent {
    static var title: LocalizedStringResource { "WellAuraWatch" }
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}
